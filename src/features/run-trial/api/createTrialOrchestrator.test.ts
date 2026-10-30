import { describe, expect, it, vi } from 'vitest'

import { JUROR_IDS } from '@/entities/agent'
import { AgentExecutionError } from '@/features/run-trial'

import {
  advocateArgumentResponse,
  advocateOpeningResponse,
  alignedJudgment,
  judgeOpeningContext,
  judgeOpeningResponse,
  jurorEvaluationResponse,
  koreanText,
} from '../model/fixtures'
import type { RunAgentInput } from '../model/runAgent.types'
import type { TrialAgentResult, TrialEvent } from '../model/trial.session'
import { createTrialOrchestrator } from './createTrialOrchestrator'

vi.mock('@/shared/config/firebase', () => ({
  firebaseApp: {},
}))

vi.mock('@/shared/api/gemini/client', () => ({
  geminiAI: {},
  geminiModel: { generateContent: vi.fn() },
}))

describe('createTrialOrchestrator', () => {
  it('정해진 순서로 재판을 끝내고 발언 순서를 절차대로 매긴다', async () => {
    const events: TrialEvent[] = []
    const calls: RunAgentInput[] = []
    const gates = {
      pro: deferred<void>(),
      con: deferred<void>(),
    }
    const orchestrator = createTrialOrchestrator({
      now: () => '2026-10-30T00:00:00.000Z',
      createId: sequence(),
      runAgent: async (input) => {
        calls.push(structuredClone(input))
        if (input.agentId === 'pro-advocate' && input.task === 'opening') await gates.pro.promise
        if (input.agentId === 'con-advocate' && input.task === 'opening') await gates.con.promise
        return responseFor(input)
      },
    })
    orchestrator.subscribe((event) => events.push(event))

    const pending = orchestrator.start(judgeOpeningContext())
    await waitFor(
      () =>
        calls.filter((call) => call.task === 'opening' && call.agentId !== 'judge').length === 2,
    )
    gates.con.resolve()
    await flushMicrotasks()
    gates.pro.resolve()

    const result = await pending

    expect(result.status).toBe('completed')
    expect(result.judgment?.verdict).toBe('pro')
    expect(result.juryAggregate).toMatchObject({ proVotes: 5, conVotes: 0, abstainVotes: 0 })
    expect(calls.map((call) => `${call.agentId}:${call.task}`)).toEqual([
      'judge:opening',
      'pro-advocate:opening',
      'con-advocate:opening',
      'pro-advocate:rebuttal',
      'con-advocate:rebuttal',
      'pro-advocate:closing',
      'con-advocate:closing',
      ...JUROR_IDS.map((id) => `${id}:evaluation`),
      'judge:judgment',
    ])
    expect(result.messages.map((message) => message.agentId)).toEqual([
      'judge',
      'pro-advocate',
      'con-advocate',
      'pro-advocate',
      'con-advocate',
      'pro-advocate',
      'con-advocate',
      ...JUROR_IDS,
      'judge',
    ])
    expect(result.messages.map((message) => message.order)).toEqual(
      result.messages.map((_, index) => index + 1),
    )
    expect(events.map((event) => event.type)).toContain('trial.completed')
    expect(events.some((event) => event.type === 'trial.failed')).toBe(false)
  })

  it('모두변론 중에는 상대 발언을 넘기지 않고 반론은 모두변론만 받는다', async () => {
    const calls: RunAgentInput[] = []
    const orchestrator = createTrialOrchestrator({
      runAgent: async (input) => {
        calls.push(structuredClone(input))
        return responseFor(input)
      },
    })

    await orchestrator.start(judgeOpeningContext())

    const openings = calls.filter((call) => call.task === 'opening' && call.agentId !== 'judge')
    expect(JSON.stringify(openings)).not.toContain('찬성 모두변론')
    expect(JSON.stringify(openings)).not.toContain('반대 모두변론')

    const rebuttals = calls.filter((call) => call.task === 'rebuttal')
    const proRebuttal = rebuttals.find((call) => call.agentId === 'pro-advocate')
    const conRebuttal = rebuttals.find((call) => call.agentId === 'con-advocate')
    expect(proRebuttal?.task).toBe('rebuttal')
    if (proRebuttal?.task === 'rebuttal' && conRebuttal?.task === 'rebuttal') {
      expect(proRebuttal.context.opponentOpening.counterArguments).toEqual([])
      expect(conRebuttal.context.opponentOpening.counterArguments).toEqual([])
      expect(proRebuttal.context.opponentOpening.statement).toContain('반대 모두변론')
      expect(JSON.stringify(proRebuttal.context)).not.toContain('반대 반론')
      expect(JSON.stringify(conRebuttal.context)).not.toContain('찬성 반론')
    }

    const juryCalls = calls.filter((call) => call.task === 'evaluation')
    expect(juryCalls).toHaveLength(5)
    const serialized = juryCalls.map((call) => JSON.stringify(call.context))
    expect(new Set(serialized).size).toBe(1)
    expect(serialized[0]).not.toContain('juror-logic')
  })

  it('배심원 동시 실행 수를 제한한다', async () => {
    let inFlight = 0
    let maxInFlight = 0
    const orchestrator = createTrialOrchestrator({
      maxConcurrentRequests: 2,
      runAgent: async (input) => {
        if (input.task === 'evaluation') {
          inFlight += 1
          maxInFlight = Math.max(maxInFlight, inFlight)
          await Promise.resolve()
          inFlight -= 1
        }
        return responseFor(input)
      },
    })

    await orchestrator.start(judgeOpeningContext())
    expect(maxInFlight).toBe(2)
  })

  it('요청 제한은 지정한 대기 후 다시 호출하고 스키마 오류는 다시 호출하지 않는다', async () => {
    const sleeps: number[] = []
    let rateLimited = true
    let schemaCalls = 0
    const orchestrator = createTrialOrchestrator({
      maxRetries: 1,
      baseRetryDelayMs: 1000,
      sleep: async (ms) => {
        sleeps.push(ms)
      },
      runAgent: async (input) => {
        if (input.agentId === 'judge' && input.task === 'opening') {
          if (rateLimited) {
            rateLimited = false
            throw new AgentExecutionError('request_failed', 'quota', {
              status: 429,
              retryAfterMs: 5000,
            })
          }
        }
        if (input.agentId === 'pro-advocate' && input.task === 'opening') {
          schemaCalls += 1
          throw new AgentExecutionError('schema_mismatch', '스키마 불일치')
        }
        return responseFor(input)
      },
    })

    await expect(orchestrator.start(judgeOpeningContext())).rejects.toMatchObject({
      kind: 'schema_mismatch',
    })
    expect(sleeps).toEqual([5000])
    expect(schemaCalls).toBe(1)
    expect(orchestrator.getRecord()).toMatchObject({
      status: 'failed',
      phase: 'statements',
      opening: { statement: expect.any(String) },
      proOpening: null,
    })
  })

  it('취소하면 다음 단계로 가지 않고 늦게 도착한 응답을 무시한다', async () => {
    let release: (value: TrialAgentResult) => void = () => {}
    const gate = new Promise<TrialAgentResult>((resolve) => {
      release = resolve
    })
    const events: TrialEvent[] = []
    const orchestrator = createTrialOrchestrator({
      runAgent: async (input) => {
        if (input.agentId === 'judge' && input.task === 'opening') return gate
        return responseFor(input)
      },
    })
    orchestrator.subscribe((event) => events.push(event))

    const pending = orchestrator.start(judgeOpeningContext())
    await flushMicrotasks()
    orchestrator.cancel()
    release(judgeOpeningResponse())

    await expect(pending).rejects.toMatchObject({ kind: 'cancelled' })
    expect(orchestrator.getStatus()).toBe('cancelled')
    expect(orchestrator.getRecord()?.opening).toBeNull()
    expect(events.some((event) => event.type === 'trial.completed')).toBe(false)
    expect(events.some((event) => event.type === 'trial.failed')).toBe(false)
    expect(events.some((event) => event.type === 'trial.cancelled')).toBe(true)
  })

  it('진행 중인 재판을 다시 시작하지 않고 서로 다른 재판 기록을 섞지 않는다', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const first = createTrialOrchestrator({
      createId: () => 'trial-a',
      runAgent: async (input) => {
        await gate
        return responseFor(input)
      },
    })
    const second = createTrialOrchestrator({
      createId: () => 'trial-b',
      runAgent: async (input) => responseFor(input),
    })

    const pending = first.start(judgeOpeningContext())
    await flushMicrotasks()
    await expect(first.start(judgeOpeningContext())).rejects.toMatchObject({ kind: 'duplicate' })

    const otherInput = {
      ...judgeOpeningContext(),
      proposition: '포커스 링을 제거하면 키보드 사용성이 나빠진다.',
      topic: '포커스 링',
      analysis: {
        ...judgeOpeningContext().analysis,
        proposition: '포커스 링을 제거하면 키보드 사용성이 나빠진다.',
        topic: '포커스 링',
      },
    }
    const other = await second.start(otherInput)
    release()
    const completed = await pending

    expect(completed.id).toBe('trial-a')
    expect(other.id).toBe('trial-b')
    expect(other.proposition).not.toBe(completed.proposition)
    expect(completed.proposition).toBe(judgeOpeningContext().proposition)
  })

  it('실패한 배심원만 다시 실행하고 다섯 명이 모이기 전에는 판결하지 않는다', async () => {
    const calls: string[] = []
    let failEvidence = true
    const orchestrator = createTrialOrchestrator({
      runAgent: async (input) => {
        calls.push(`${input.agentId}:${input.task}`)
        if (input.agentId === 'juror-evidence' && failEvidence) {
          throw new AgentExecutionError('schema_mismatch', '배심원 응답 오류')
        }
        return responseFor(input)
      },
    })

    await expect(orchestrator.start(judgeOpeningContext())).rejects.toMatchObject({
      kind: 'schema_mismatch',
    })

    const failed = orchestrator.getRecord()
    expect(failed?.phase).toBe('jury-deliberation')
    expect(failed?.juryEvaluations.map((item) => item.jurorId)).not.toContain('juror-evidence')
    expect(failed?.juryEvaluations).toHaveLength(4)
    expect(failed?.judgment).toBeNull()
    expect(calls.filter((call) => call === 'judge:judgment')).toHaveLength(0)

    failEvidence = false
    const callsBeforeResume = calls.length
    const completed = await orchestrator.resume()

    expect(completed.status).toBe('completed')
    expect(completed.juryEvaluations.map((item) => item.jurorId)).toEqual([...JUROR_IDS])
    expect(new Set(completed.juryEvaluations.map((item) => item.jurorId)).size).toBe(5)
    const retried = calls.slice(callsBeforeResume)
    expect(retried.filter((call) => call.endsWith(':evaluation'))).toEqual([
      'juror-evidence:evaluation',
    ])
    expect(retried.at(-1)).toBe('judge:judgment')
  })
})

function responseFor(input: RunAgentInput): TrialAgentResult {
  if (input.agentId === 'judge' && input.task === 'opening') return judgeOpeningResponse()
  if (input.agentId === 'judge' && input.task === 'judgment') return alignedJudgment()
  if (input.task === 'opening' && input.agentId === 'pro-advocate') {
    return { ...advocateOpeningResponse(), statement: koreanText('찬성 모두변론', 80) }
  }
  if (input.task === 'opening' && input.agentId === 'con-advocate') {
    return { ...advocateOpeningResponse(), statement: koreanText('반대 모두변론', 80) }
  }
  if (input.task === 'rebuttal' && input.agentId === 'pro-advocate') {
    return { ...advocateArgumentResponse(), statement: koreanText('찬성 반론', 80) }
  }
  if (input.task === 'rebuttal') {
    return { ...advocateArgumentResponse(), statement: koreanText('반대 반론', 80) }
  }
  if (input.task === 'closing') return advocateArgumentResponse()
  if (input.task === 'evaluation') {
    return { ...jurorEvaluationResponse(), jurorId: input.agentId }
  }
  return judgeOpeningResponse()
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {}
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function sequence() {
  let count = 0
  return () => `id-${count++}`
}

async function waitFor(predicate: () => boolean) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (predicate()) return
    await Promise.resolve()
  }

  throw new Error('조건이 만족되지 않았습니다.')
}

async function flushMicrotasks() {
  await Promise.resolve()
  await Promise.resolve()
}
