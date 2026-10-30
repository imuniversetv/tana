import type { JuryMajority, JuryScore, JuryVote } from './trial.types'

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
