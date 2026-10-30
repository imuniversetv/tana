import { useEffect, useState } from 'react'

import { JUROR_IDS } from '@/entities/agent'
import type { AgentId } from '@/entities/agent'
import type { CaseAnalysis } from '@/entities/case'
import type {
  JudgeJudgmentResponse,
  JurorEvaluation,
  TrialIssue,
  TrialStatement,
} from '@/entities/trial'
import { runAgent, toTrialStatement } from '@/features/run-trial'

import { AgentSpeechPage } from './AgentSpeechPage'

interface TrialPageProps {
  originalText: string
  analysis: CaseAnalysis
}

interface SpeechLine {
  role: AgentId
  message: string
}

interface RunOptions {
  signal: AbortSignal
}

const VERDICT_LABEL: Record<JudgeJudgmentResponse['verdict'], string> = {
  pro: '찬성 측 승소',
  con: '반대 측 승소',
  undetermined: '판단 보류',
}

const VOTE_LABEL: Record<JurorEvaluation['vote'], string> = {
  pro: '찬성',
  con: '반대',
  abstain: '기권',
}

export function TrialPage({ originalText, analysis }: TrialPageProps) {
  const [lines, setLines] = useState<SpeechLine[]>([])
  const [index, setIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    const options = { signal: controller.signal }

    const push = (line: SpeechLine) => {
      if (!active) return
      setLines((current) => [...current, line])
    }

    const run = async () => {
      const proposition = analysis.proposition
      const opening = await runAgent(
        {
          agentId: 'judge',
          task: 'opening',
          context: {
            originalText,
            proposition,
            category: analysis.category,
            topic: analysis.topic,
            analysis,
          },
        },
        options,
      )
      push({ role: 'judge', message: opening.statement })

      const [proOpening, conOpening] = await openingStatements(
        proposition,
        opening.issues,
        options,
      )
      push({ role: 'pro-advocate', message: proOpening.statement })
      push({ role: 'con-advocate', message: conOpening.statement })

      const [proRebuttal, conRebuttal] = await rebuttalStatements(
        proposition,
        opening.issues,
        proOpening,
        conOpening,
        options,
      )
      push({ role: 'pro-advocate', message: proRebuttal.statement })
      push({ role: 'con-advocate', message: conRebuttal.statement })

      const [proClosing, conClosing] = await closingStatements(
        proposition,
        proOpening,
        conOpening,
        proRebuttal,
        conRebuttal,
        options,
      )
      push({ role: 'pro-advocate', message: proClosing.statement })
      push({ role: 'con-advocate', message: conClosing.statement })

      const pleadings = {
        proposition,
        issues: opening.issues,
        proOpening,
        conOpening,
        proRebuttal,
        conRebuttal,
        proClosing,
        conClosing,
      }
      const evaluations = await mapWithConcurrency(JUROR_IDS, 2, (jurorId) =>
        runAgent({ agentId: jurorId, task: 'evaluation', context: pleadings }, options),
      )

      for (const evaluation of evaluations) {
        push({
          role: evaluation.jurorId,
          message: `${VOTE_LABEL[evaluation.vote]}\n${evaluation.rationale}`,
        })
      }

      const judgment = await runAgent(
        {
          agentId: 'judge',
          task: 'judgment',
          context: { ...pleadings, criteria: opening.criteria, juryEvaluations: evaluations },
        },
        options,
      )
      push({
        role: 'judge',
        message: `${VERDICT_LABEL[judgment.verdict]}\n${judgment.opinion}`,
      })
    }

    run().catch((caught: unknown) => {
      if (!active || controller.signal.aborted) return
      console.error(caught)
      const message = '재판 진행에 실패했습니다. 다시 시도해주세요.'
      setError(message)
      setLines((current) =>
        current.length === 0 ? current : [...current, { role: 'judge', message }],
      )
    })

    return () => {
      active = false
      controller.abort()
    }
  }, [analysis, originalText])

  const current = lines[index]
  const hasNext = index < lines.length - 1

  return (
    <AgentSpeechPage
      role={current?.role ?? 'judge'}
      message={current?.message ?? error ?? '재판을 준비하고 있습니다.'}
      onNext={() => setIndex((currentIndex) => currentIndex + 1)}
      disabled={!current || !hasNext}
    />
  )
}

async function openingStatements(
  proposition: string,
  issues: TrialIssue[],
  options: RunOptions,
): Promise<[TrialStatement, TrialStatement]> {
  const [proResponse, conResponse] = await Promise.all([
    runAgent(
      { agentId: 'pro-advocate', task: 'opening', context: { proposition, issues } },
      options,
    ),
    runAgent(
      { agentId: 'con-advocate', task: 'opening', context: { proposition, issues } },
      options,
    ),
  ])

  return [toTrialStatement(proResponse, 'pro'), toTrialStatement(conResponse, 'con')]
}

async function rebuttalStatements(
  proposition: string,
  issues: TrialIssue[],
  proOpening: TrialStatement,
  conOpening: TrialStatement,
  options: RunOptions,
): Promise<[TrialStatement, TrialStatement]> {
  const [proResponse, conResponse] = await Promise.all([
    runAgent(
      {
        agentId: 'pro-advocate',
        task: 'rebuttal',
        context: { proposition, issues, ownOpening: proOpening, opponentOpening: conOpening },
      },
      options,
    ),
    runAgent(
      {
        agentId: 'con-advocate',
        task: 'rebuttal',
        context: { proposition, issues, ownOpening: conOpening, opponentOpening: proOpening },
      },
      options,
    ),
  ])

  return [toTrialStatement(proResponse, 'pro'), toTrialStatement(conResponse, 'con')]
}

async function closingStatements(
  proposition: string,
  proOpening: TrialStatement,
  conOpening: TrialStatement,
  proRebuttal: TrialStatement,
  conRebuttal: TrialStatement,
  options: RunOptions,
): Promise<[TrialStatement, TrialStatement]> {
  const context = { proposition, proOpening, conOpening, proRebuttal, conRebuttal }
  const [proResponse, conResponse] = await Promise.all([
    runAgent({ agentId: 'pro-advocate', task: 'closing', context }, options),
    runAgent({ agentId: 'con-advocate', task: 'closing', context }, options),
  ])

  return [toTrialStatement(proResponse, 'pro'), toTrialStatement(conResponse, 'con')]
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0

  async function run() {
    while (cursor < items.length) {
      const current = cursor
      cursor += 1
      results[current] = await worker(items[current])
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()))
  return results
}
