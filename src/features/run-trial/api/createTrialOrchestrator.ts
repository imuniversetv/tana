import { getAgent, JUROR_IDS } from '@/entities/agent'
import type { AdvocateId, AgentId } from '@/entities/agent'
import { aggregateJury, juryScoreMismatches } from '@/entities/trial'
import type {
  AdvocateArgumentResponse,
  AdvocateOpeningResponse,
  JudgeJudgmentResponse,
  JudgeOpeningContext,
  JudgeOpeningResponse,
  JurorEvaluation,
  JurorEvaluationContext,
  TrialStatement,
} from '@/entities/trial'

import { assertJudgmentConsistency } from '../lib/assertJudgmentConsistency'
import { classifyTrialError, isRetryableTrialError, retryDelayMs } from '../lib/classifyTrialError'
import { mapWithConcurrency } from '../lib/mapWithConcurrency'
import { toTrialStatement } from '../lib/toTrialStatement'
import { judgeOpeningContextSchema } from '../model/context.schema'
import type {
  TrialAgentResult,
  TrialErrorKind,
  TrialEvent,
  TrialMessage,
  TrialPhase,
  TrialRecord,
  TrialStatus,
} from '../model/trial.session'
import { TRIAL_PHASES } from '../model/trial.session'
import { runAgent as defaultRunAgent } from './runAgent'
import type { RunAgentInput, RunAgentOptions } from '../model/runAgent.types'

export class TrialOrchestratorError extends Error {
  readonly kind: TrialErrorKind

  constructor(kind: TrialErrorKind, message: string) {
    super(message)
    this.name = 'TrialOrchestratorError'
    this.kind = kind
  }
}

export interface TrialOrchestratorOptions {
  runAgent?: (input: RunAgentInput, options?: RunAgentOptions) => Promise<TrialAgentResult>
  now?: () => string
  createId?: () => string
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>
  maxConcurrentRequests?: number
  maxRetries?: number
  baseRetryDelayMs?: number
  maxRetryDelayMs?: number
}

export interface StartTrialOptions {
  signal?: AbortSignal
}

const DEFAULT_CONCURRENCY = 2
const DEFAULT_MAX_RETRIES = 2
const DEFAULT_BASE_DELAY_MS = 1000
const DEFAULT_MAX_DELAY_MS = 8000

export function createTrialOrchestrator(options: TrialOrchestratorOptions = {}) {
  const concurrency = options.maxConcurrentRequests ?? DEFAULT_CONCURRENCY
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES
  const baseRetryDelayMs = options.baseRetryDelayMs ?? DEFAULT_BASE_DELAY_MS
  const maxRetryDelayMs = options.maxRetryDelayMs ?? DEFAULT_MAX_DELAY_MS

  if (concurrency < 1) {
    throw new TrialOrchestratorError('invalid_input', '동시 실행 수는 1 이상이어야 합니다.')
  }

  const runner = options.runAgent ?? ((input, runOptions) => defaultRunAgent(input, runOptions))
  const now = options.now ?? (() => new Date().toISOString())
  const createId = options.createId ?? (() => crypto.randomUUID())
  const sleep = options.sleep ?? delay

  let record: TrialRecord | null = null
  let runId = 0
  let nextOrder = 1
  let abortController: AbortController | null = null
  let stopExternalSignal: (() => void) | null = null
  const listeners = new Set<(event: TrialEvent) => void>()

  function subscribe(listener: (event: TrialEvent) => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  function getStatus(): TrialStatus {
    return record?.status ?? 'idle'
  }

  function getRecord(): TrialRecord | null {
    return record ? clone(record) : null
  }

  async function start(input: JudgeOpeningContext, startOptions: StartTrialOptions = {}) {
    if (record?.status === 'running') {
      throw new TrialOrchestratorError('duplicate', '이미 진행 중인 재판이 있습니다.')
    }

    const parsed = judgeOpeningContextSchema.safeParse(input)
    if (!parsed.success) {
      throw new TrialOrchestratorError('invalid_input', '재판을 시작할 수 있는 논제가 아닙니다.')
    }

    if (startOptions.signal?.aborted) {
      throw new TrialOrchestratorError('cancelled', '재판이 취소되었습니다.')
    }

    record = createRecord(parsed.data, createId(), now())
    nextOrder = 1
    runId += 1
    const currentRun = runId
    bindSignal(startOptions.signal)
    emit({ type: 'trial.started', trialId: record.id })

    await runFrom(currentRun, 'opening')
    return finishStart()
  }

  async function resume() {
    if (record?.status === 'running') {
      throw new TrialOrchestratorError('duplicate', '이미 진행 중인 재판이 있습니다.')
    }

    if (!record || record.status !== 'failed' || !record.phase) {
      throw new TrialOrchestratorError('unexpected', '재개할 실패 재판이 없습니다.')
    }

    record.status = 'running'
    record.error = null
    record.finishedAt = null
    runId += 1
    const currentRun = runId
    bindSignal()
    await runFrom(currentRun, record.phase)
    return finishStart()
  }

  function cancel() {
    if (!record || record.status !== 'running') return

    runId += 1
    record.status = 'cancelled'
    record.finishedAt = now()
    abortController?.abort()
    stopListening()
    emit({
      type: 'trial.cancelled',
      trialId: record.id,
      phase: record.phase,
    })
  }

  async function runFrom(currentRun: number, from: TrialPhase) {
    const startIndex = TRIAL_PHASES.indexOf(from)

    try {
      for (const phase of TRIAL_PHASES.slice(startIndex)) {
        if (!isCurrent(currentRun)) return
        await runPhase(currentRun, phase)
        if (!isCurrent(currentRun)) return
      }

      complete(currentRun)
    } catch (error) {
      if (!isCurrent(currentRun) || record?.status === 'cancelled') return
      failPhase(record?.phase ?? from, classifyTrialError(error))
    }
  }

  async function runPhase(currentRun: number, phase: TrialPhase) {
    switch (phase) {
      case 'opening':
        return runOpening(currentRun)
      case 'statements':
        return runStatements(currentRun)
      case 'rebuttals':
        return runRebuttals(currentRun)
      case 'closings':
        return runClosings(currentRun)
      case 'jury-deliberation':
        return runJury(currentRun)
      case 'judgment':
        return runJudgment(currentRun)
    }
  }

  async function runOpening(currentRun: number) {
    beginPhase('opening')
    if (!record?.opening) {
      const saved = await runTask(currentRun, 'opening', 'judge', reserveOrder(), {
        execute: () =>
          runner(
            {
              agentId: 'judge',
              task: 'opening',
              context: openingContext(),
            },
            { signal: signal() },
          ),
        content: (result) => {
          if (!isJudgeOpening(result)) {
            throw new TrialOrchestratorError('unexpected', '재판 개시 응답 형식이 아닙니다.')
          }
          return result.statement
        },
        save: (result, message) => {
          if (!record || !isJudgeOpening(result)) return
          record.opening = clone(result)
          addMessage(message)
        },
      })

      if (!isCurrent(currentRun)) return
      if (!saved || !record?.opening) {
        failPhase('opening')
        return
      }
    }

    endPhase(currentRun, 'opening')
  }

  async function runStatements(currentRun: number) {
    beginPhase('statements')
    if (!record?.opening) {
      failPhase('statements')
      return
    }

    const tasks = advocateTasks([
      ['pro-advocate', record.proOpening],
      ['con-advocate', record.conOpening],
    ])

    await runPool(currentRun, tasks, (task) =>
      runTask(currentRun, 'statements', task.agentId, task.order, {
        execute: () =>
          runner(
            {
              agentId: task.agentId,
              task: 'opening',
              context: {
                proposition: record!.proposition,
                issues: record!.opening!.issues.map((issue) => ({ ...issue })),
              },
            },
            { signal: signal() },
          ),
        content: (result) => openingSpeech(result),
        save: (result, message) => {
          if (!record || !isAdvocateOpening(result)) return
          const statement = clone(toTrialStatement(result, sideOf(task.agentId)))
          if (task.agentId === 'pro-advocate') record.proOpening = statement
          else record.conOpening = statement
          addMessage(message)
        },
      }),
    )

    if (!isCurrent(currentRun)) return
    if (!record.proOpening || !record.conOpening) {
      failPhase('statements')
      return
    }

    endPhase(currentRun, 'statements')
  }

  async function runRebuttals(currentRun: number) {
    beginPhase('rebuttals')
    if (!record?.opening || !record.proOpening || !record.conOpening) {
      failPhase('rebuttals')
      return
    }

    const tasks = advocateTasks([
      ['pro-advocate', record.proRebuttal],
      ['con-advocate', record.conRebuttal],
    ])

    await runPool(currentRun, tasks, (task) =>
      runTask(currentRun, 'rebuttals', task.agentId, task.order, {
        execute: () =>
          runner(
            {
              agentId: task.agentId,
              task: 'rebuttal',
              context: {
                proposition: record!.proposition,
                issues: record!.opening!.issues.map((issue) => ({ ...issue })),
                ownOpening: clone(sideStatement(task.agentId, 'opening')),
                opponentOpening: clone(opponentStatement(task.agentId, 'opening')),
              },
            },
            { signal: signal() },
          ),
        content: (result) => argumentSpeech(result),
        save: (result, message) => {
          if (!record || !isAdvocateArgument(result)) return
          const statement = clone(toTrialStatement(result, sideOf(task.agentId)))
          if (task.agentId === 'pro-advocate') record.proRebuttal = statement
          else record.conRebuttal = statement
          addMessage(message)
        },
      }),
    )

    if (!isCurrent(currentRun)) return
    if (!record.proRebuttal || !record.conRebuttal) {
      failPhase('rebuttals')
      return
    }

    endPhase(currentRun, 'rebuttals')
  }

  async function runClosings(currentRun: number) {
    beginPhase('closings')
    if (!record?.proOpening || !record.conOpening || !record.proRebuttal || !record.conRebuttal) {
      failPhase('closings')
      return
    }

    const snapshot = {
      proposition: record.proposition,
      proOpening: clone(record.proOpening),
      conOpening: clone(record.conOpening),
      proRebuttal: clone(record.proRebuttal),
      conRebuttal: clone(record.conRebuttal),
    }
    const tasks = advocateTasks([
      ['pro-advocate', record.proClosing],
      ['con-advocate', record.conClosing],
    ])

    await runPool(currentRun, tasks, (task) =>
      runTask(currentRun, 'closings', task.agentId, task.order, {
        execute: () =>
          runner(
            {
              agentId: task.agentId,
              task: 'closing',
              context: snapshot,
            },
            { signal: signal() },
          ),
        content: (result) => argumentSpeech(result),
        save: (result, message) => {
          if (!record || !isAdvocateArgument(result)) return
          const statement = clone(toTrialStatement(result, sideOf(task.agentId)))
          if (task.agentId === 'pro-advocate') record.proClosing = statement
          else record.conClosing = statement
          addMessage(message)
        },
      }),
    )

    if (!isCurrent(currentRun)) return
    if (!record.proClosing || !record.conClosing) {
      failPhase('closings')
      return
    }

    endPhase(currentRun, 'closings')
  }

  async function runJury(currentRun: number) {
    beginPhase('jury-deliberation')
    const context = juryContext()
    if (!context) {
      failPhase('jury-deliberation')
      return
    }

    const pending = JUROR_IDS.filter(
      (jurorId) => !record?.juryEvaluations.some((evaluation) => evaluation.jurorId === jurorId),
    ).map((agentId) => ({ agentId, order: reserveOrder() }))

    await runPool(currentRun, pending, (task) =>
      runTask(currentRun, 'jury-deliberation', task.agentId, task.order, {
        execute: () =>
          runner(
            {
              agentId: task.agentId,
              task: 'evaluation',
              context: clone(context),
            },
            { signal: signal() },
          ),
        content: (result) => {
          if (!isJurorEvaluation(result) || result.jurorId !== task.agentId) {
            throw new TrialOrchestratorError('schema_mismatch', '배심원 평가 응답 형식이 아닙니다.')
          }
          if (juryScoreMismatches(result).length > 0) {
            throw new TrialOrchestratorError('schema_mismatch', '배심원 점수 합계가 맞지 않습니다.')
          }
          return result.rationale
        },
        save: (result, message) => {
          if (!record || !isJurorEvaluation(result) || result.jurorId !== task.agentId) return
          if (record.juryEvaluations.some((evaluation) => evaluation.jurorId === result.jurorId)) {
            return
          }
          record.juryEvaluations.push(clone(result))
          addMessage(message)
        },
      }),
    )

    if (!isCurrent(currentRun) || !record) return

    const ordered = orderedJury()
    if (ordered.length !== JUROR_IDS.length) {
      failPhase('jury-deliberation')
      return
    }

    const juryAggregate = aggregateJury(ordered)
    if (juryAggregate.mismatches.length > 0) {
      failPhase('jury-deliberation')
      return
    }

    record.juryEvaluations = ordered
    record.juryAggregate = juryAggregate
    endPhase(currentRun, 'jury-deliberation')
  }

  async function runJudgment(currentRun: number) {
    beginPhase('judgment')
    const context = judgmentContext()
    if (!context) {
      failPhase('judgment')
      return
    }

    if (!record?.judgment) {
      const saved = await runTask(currentRun, 'judgment', 'judge', reserveOrder(), {
        execute: () =>
          runner(
            {
              agentId: 'judge',
              task: 'judgment',
              context,
            },
            { signal: signal() },
          ),
        content: (result) => {
          if (!isJudgment(result)) {
            throw new TrialOrchestratorError('unexpected', '최종 판결 응답 형식이 아닙니다.')
          }
          assertJudgmentConsistency(result, orderedJury())
          return result.opinion
        },
        save: (result, message) => {
          if (!record || !isJudgment(result)) return
          record.judgment = clone(result)
          addMessage(message)
        },
      })

      if (!isCurrent(currentRun)) return
      if (!saved || !record?.judgment) {
        failPhase('judgment')
        return
      }
    }

    endPhase(currentRun, 'judgment')
  }

  async function runPool<T>(
    currentRun: number,
    tasks: readonly T[],
    worker: (task: T) => Promise<boolean>,
  ) {
    if (tasks.length === 0) return

    try {
      await mapWithConcurrency(tasks, concurrency, async (task) => {
        if (!isCurrent(currentRun)) {
          throw new TrialOrchestratorError('cancelled', '재판이 취소되었습니다.')
        }
        return worker(task)
      })
    } catch (error) {
      if (!isCurrent(currentRun) || classifyTrialError(error).kind === 'cancelled') return
      throw error
    }
  }

  async function runTask(
    currentRun: number,
    phase: TrialPhase,
    agentId: AgentId,
    order: number,
    task: {
      execute: () => Promise<TrialAgentResult>
      content: (result: TrialAgentResult) => string
      save: (result: TrialAgentResult, message: TrialMessage) => void
    },
  ) {
    if (!record || !isCurrent(currentRun)) return false

    emit({ type: 'agent.started', trialId: record.id, phase, agentId })

    try {
      const result = await attempt(currentRun, task.execute)
      if (!isCurrent(currentRun) || !record) return false

      const message = createMessage(agentId, phase, task.content(result), order)
      task.save(result, message)
      clearAgentError(agentId)
      emit({
        type: 'agent.completed',
        trialId: record.id,
        phase,
        agentId,
        message,
        result,
      })
      return true
    } catch (error) {
      if (!isCurrent(currentRun) || classifyTrialError(error).kind === 'cancelled') {
        throw new TrialOrchestratorError('cancelled', '재판이 취소되었습니다.')
      }

      noteAgentError(agentId, classifyTrialError(error))
      return false
    }
  }

  async function attempt(currentRun: number, execute: () => Promise<TrialAgentResult>) {
    let retries = 0

    while (true) {
      if (!isCurrent(currentRun)) {
        throw new TrialOrchestratorError('cancelled', '재판이 취소되었습니다.')
      }

      try {
        return await execute()
      } catch (error) {
        if (!isCurrent(currentRun)) {
          throw new TrialOrchestratorError('cancelled', '재판이 취소되었습니다.')
        }

        const failure = classifyTrialError(error)
        if (
          failure.kind === 'cancelled' ||
          !isRetryableTrialError(failure.kind) ||
          retries >= maxRetries
        ) {
          throw error
        }

        await sleep(
          retryDelayMs(retries, baseRetryDelayMs, maxRetryDelayMs, failure.retryAfterMs),
          signal(),
        )
        retries += 1
      }
    }
  }

  function advocateTasks(entries: ReadonlyArray<readonly [AdvocateId, TrialStatement | null]>) {
    return entries
      .filter(([, statement]) => statement === null)
      .map(([agentId]) => ({ agentId, order: reserveOrder() }))
  }

  function openingContext(): JudgeOpeningContext {
    if (!record) {
      throw new TrialOrchestratorError('unexpected', '재판 기록이 없습니다.')
    }

    return {
      originalText: record.originalText,
      proposition: record.proposition,
      category: record.category,
      topic: record.topic,
      analysis: { ...record.analysis },
    }
  }

  function juryContext(): JurorEvaluationContext | null {
    if (
      !record?.opening ||
      !record.proOpening ||
      !record.conOpening ||
      !record.proRebuttal ||
      !record.conRebuttal ||
      !record.proClosing ||
      !record.conClosing
    ) {
      return null
    }

    return {
      proposition: record.proposition,
      issues: record.opening.issues.map((issue) => ({ ...issue })),
      proOpening: clone(record.proOpening),
      conOpening: clone(record.conOpening),
      proRebuttal: clone(record.proRebuttal),
      conRebuttal: clone(record.conRebuttal),
      proClosing: clone(record.proClosing),
      conClosing: clone(record.conClosing),
    }
  }

  function judgmentContext() {
    const context = juryContext()
    const ordered = orderedJury()
    if (!record?.opening || !context || ordered.length !== JUROR_IDS.length) return null

    return {
      proposition: record.proposition,
      issues: record.opening.issues.map((issue) => ({ ...issue })),
      criteria: record.opening.criteria.map((criterion) => ({ ...criterion })),
      proOpening: context.proOpening,
      conOpening: context.conOpening,
      proRebuttal: context.proRebuttal,
      conRebuttal: context.conRebuttal,
      proClosing: context.proClosing,
      conClosing: context.conClosing,
      juryEvaluations: ordered.map((evaluation) => clone(evaluation)),
    }
  }

  function orderedJury() {
    return JUROR_IDS.flatMap((jurorId) => {
      const found = record?.juryEvaluations.find((evaluation) => evaluation.jurorId === jurorId)
      return found ? [found] : []
    })
  }

  function sideStatement(agentId: AdvocateId, kind: 'opening' | 'rebuttal') {
    if (!record) throw new TrialOrchestratorError('unexpected', '재판 기록이 없습니다.')
    const statement =
      agentId === 'pro-advocate'
        ? kind === 'opening'
          ? record.proOpening
          : record.proRebuttal
        : kind === 'opening'
          ? record.conOpening
          : record.conRebuttal

    if (!statement) throw new TrialOrchestratorError('unexpected', '이전 변론이 없습니다.')
    return statement
  }

  function opponentStatement(agentId: AdvocateId, kind: 'opening' | 'rebuttal') {
    return sideStatement(agentId === 'pro-advocate' ? 'con-advocate' : 'pro-advocate', kind)
  }

  function beginPhase(phase: TrialPhase) {
    if (!record) return
    record.phase = phase
    emit({ type: 'phase.started', trialId: record.id, phase })
  }

  function endPhase(currentRun: number, phase: TrialPhase) {
    if (!record || !isCurrent(currentRun)) return
    emit({ type: 'phase.completed', trialId: record.id, phase })
  }

  function complete(currentRun: number) {
    if (!record || !isCurrent(currentRun)) return
    record.status = 'completed'
    record.finishedAt = now()
    record.error = null
    record.agentErrors = []
    stopListening()
    emit({ type: 'trial.completed', trialId: record.id, record: clone(record) })
  }

  function failPhase(
    phase: TrialPhase,
    failure?: { kind: TrialErrorKind; message: string; agentId?: AgentId },
  ) {
    if (!record || record.status !== 'running') return

    const resolved = failure ?? agentFailure()
    record.status = 'failed'
    record.phase = phase
    record.finishedAt = now()
    record.error = {
      kind: resolved.kind,
      message: resolved.message,
      phase,
      agentId: resolved.agentId,
    }
    stopListening()
    emit({ type: 'trial.failed', trialId: record.id, phase, error: record.error })
  }

  function agentFailure(): { kind: TrialErrorKind; message: string; agentId?: AgentId } {
    const agentError = record?.agentErrors[0]
    if (!agentError) {
      return { kind: 'unexpected', message: '재판 단계를 완료하지 못했습니다.' }
    }

    return {
      kind: agentError.kind,
      message: agentError.message,
      agentId: agentError.agentId,
    }
  }

  function finishStart() {
    if (!record) {
      throw new TrialOrchestratorError('unexpected', '재판 기록이 없습니다.')
    }

    const snapshot = clone(record)
    if (snapshot.status === 'completed') return snapshot
    if (snapshot.status === 'cancelled') {
      throw new TrialOrchestratorError('cancelled', '재판이 취소되었습니다.')
    }

    throw new TrialOrchestratorError(
      snapshot.error?.kind ?? 'unexpected',
      snapshot.error?.message ?? '재판을 완료하지 못했습니다.',
    )
  }

  function noteAgentError(agentId: AgentId, failure: { kind: TrialErrorKind; message: string }) {
    if (!record) return
    record.agentErrors = record.agentErrors.filter((item) => item.agentId !== agentId)
    record.agentErrors.push({ agentId, kind: failure.kind, message: failure.message })
  }

  function clearAgentError(agentId: AgentId) {
    if (!record) return
    record.agentErrors = record.agentErrors.filter((item) => item.agentId !== agentId)
  }

  function createMessage(agentId: AgentId, phase: TrialPhase, content: string, order: number) {
    if (!record) throw new TrialOrchestratorError('unexpected', '재판 기록이 없습니다.')

    return {
      id: createId(),
      trialId: record.id,
      agentId,
      role: getAgent(agentId).role,
      phase,
      content,
      createdAt: now(),
      order,
    }
  }

  function addMessage(message: TrialMessage) {
    if (!record) return
    record.messages.push(message)
    record.messages.sort((left, right) => left.order - right.order)
  }

  function reserveOrder() {
    const order = nextOrder
    nextOrder += 1
    return order
  }

  function bindSignal(signalToBind?: AbortSignal) {
    stopListening()
    abortController = new AbortController()

    if (!signalToBind) return
    if (signalToBind.aborted) {
      abortController.abort()
      return
    }

    const onAbort = () => cancel()
    signalToBind.addEventListener('abort', onAbort, { once: true })
    stopExternalSignal = () => signalToBind.removeEventListener('abort', onAbort)
  }

  function stopListening() {
    stopExternalSignal?.()
    stopExternalSignal = null
  }

  function signal() {
    return abortController?.signal ?? new AbortController().signal
  }

  function isCurrent(currentRun: number) {
    return runId === currentRun && record?.status === 'running'
  }

  function emit(event: TrialEvent) {
    for (const listener of listeners) listener(event)
  }

  return { start, resume, cancel, subscribe, getRecord, getStatus }
}

function createRecord(input: JudgeOpeningContext, id: string, startedAt: string): TrialRecord {
  return {
    id,
    originalText: input.originalText,
    proposition: input.proposition,
    category: input.category,
    topic: input.topic,
    analysis: { ...input.analysis },
    status: 'running',
    phase: null,
    opening: null,
    proOpening: null,
    conOpening: null,
    proRebuttal: null,
    conRebuttal: null,
    proClosing: null,
    conClosing: null,
    juryEvaluations: [],
    juryAggregate: null,
    judgment: null,
    messages: [],
    agentErrors: [],
    error: null,
    startedAt,
    finishedAt: null,
  }
}

function sideOf(agentId: AdvocateId) {
  return agentId === 'pro-advocate' ? 'pro' : 'con'
}

function openingSpeech(result: TrialAgentResult) {
  if (!isAdvocateOpening(result)) {
    throw new TrialOrchestratorError('unexpected', '모두변론 응답 형식이 아닙니다.')
  }
  return result.statement
}

function argumentSpeech(result: TrialAgentResult) {
  if (!isAdvocateArgument(result)) {
    throw new TrialOrchestratorError('unexpected', '변론 응답 형식이 아닙니다.')
  }
  return result.statement
}

function isJudgeOpening(result: TrialAgentResult): result is JudgeOpeningResponse {
  return 'issues' in result && 'criteria' in result
}

function isJudgment(result: TrialAgentResult): result is JudgeJudgmentResponse {
  return 'verdict' in result
}

function isJurorEvaluation(result: TrialAgentResult): result is JurorEvaluation {
  return 'vote' in result && 'jurorId' in result
}

function isAdvocateArgument(result: TrialAgentResult): result is AdvocateArgumentResponse {
  return 'counterArguments' in result
}

function isAdvocateOpening(result: TrialAgentResult): result is AdvocateOpeningResponse {
  return (
    'statement' in result &&
    'arguments' in result &&
    !isAdvocateArgument(result) &&
    !isJudgeOpening(result)
  )
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError())
      return
    }

    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(abortError())
    }

    signal.addEventListener('abort', onAbort, { once: true })
  })
}

function abortError() {
  const error = new Error('요청이 중단되었습니다.')
  error.name = 'AbortError'
  return error
}
