import type { JurorEvaluation, JuryMajority, JuryScore, JuryVote } from './trial.types'

export const JURY_RUBRIC = [
  { key: 'logicalValidity', label: '논리적 타당성', maxScore: 30 },
  { key: 'evidenceReliability', label: '근거의 신뢰성', maxScore: 30 },
  { key: 'rebuttalResponse', label: '반론 대응 능력', maxScore: 20 },
  { key: 'overallPersuasiveness', label: '전체 설득력', maxScore: 20 },
] as const satisfies readonly {
  key: Exclude<keyof JuryScore, 'total'>
  label: string
  maxScore: number
}[]

export const JURY_TOTAL_MAX = 100

export interface JuryTally {
  pro: number
  con: number
  abstain: number
  majority: JuryMajority
}

export function summarizeJuryVotes(votes: readonly JuryVote[]): JuryTally {
  const pro = votes.filter((vote) => vote === 'pro').length
  const con = votes.filter((vote) => vote === 'con').length
  const abstain = votes.filter((vote) => vote === 'abstain').length

  return {
    pro,
    con,
    abstain,
    majority: majorityOf(pro, con),
  }
}

function majorityOf(pro: number, con: number): JuryMajority {
  if (pro >= 3 && pro > con) return 'pro'
  if (con >= 3 && con > pro) return 'con'
  return 'split'
}

export interface JuryScoreMismatch {
  jurorId: JurorEvaluation['jurorId']
  side: 'pro' | 'con'
  reportedTotal: number
  calculatedTotal: number
}

export interface JuryAggregate {
  proVotes: number
  conVotes: number
  abstainVotes: number
  majority: JuryMajority
  proAverageScore: number
  conAverageScore: number
  evaluations: JurorEvaluation[]
  mismatches: JuryScoreMismatch[]
}

export function calculatedScoreTotal(score: JuryScore): number {
  return (
    score.logicalValidity +
    score.evidenceReliability +
    score.rebuttalResponse +
    score.overallPersuasiveness
  )
}

export function juryScoreMismatches(evaluation: JurorEvaluation): JuryScoreMismatch[] {
  return (['pro', 'con'] as const).flatMap((side) => {
    const score = evaluation[side]
    const calculatedTotal = calculatedScoreTotal(score)
    const outOfRange = JURY_RUBRIC.some((item) => {
      const value = score[item.key]
      return !Number.isInteger(value) || value < 0 || value > item.maxScore
    })

    if (!outOfRange && score.total === calculatedTotal) return []

    return [
      {
        jurorId: evaluation.jurorId,
        side,
        reportedTotal: score.total,
        calculatedTotal,
      },
    ]
  })
}

export function aggregateJury(evaluations: readonly JurorEvaluation[]): JuryAggregate {
  const votes = summarizeJuryVotes(evaluations.map((evaluation) => evaluation.vote))

  return {
    proVotes: votes.pro,
    conVotes: votes.con,
    abstainVotes: votes.abstain,
    majority: votes.majority,
    proAverageScore: average(evaluations.map((evaluation) => calculatedScoreTotal(evaluation.pro))),
    conAverageScore: average(evaluations.map((evaluation) => calculatedScoreTotal(evaluation.con))),
    evaluations: evaluations.map((evaluation) => ({
      ...evaluation,
      pro: { ...evaluation.pro },
      con: { ...evaluation.con },
    })),
    mismatches: evaluations.flatMap((evaluation) => juryScoreMismatches(evaluation)),
  }
}

function average(values: readonly number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}
