import { summarizeJuryVotes } from '@/entities/trial'
import type { JudgeJudgmentResponse, JurorEvaluation } from '@/entities/trial'

import { AgentExecutionError } from '../model/errors'

export function assertJudgmentConsistency(
  judgment: JudgeJudgmentResponse,
  evaluations: readonly JurorEvaluation[],
): void {
  const tally = summarizeJuryVotes(evaluations.map((item) => item.vote))
  const diverges = tally.majority !== 'split' && judgment.verdict !== tally.majority

  if (judgment.divergesFromJuryMajority !== diverges) {
    throw new AgentExecutionError(
      'schema_mismatch',
      '배심원 다수 의견과 판결의 차이 표시가 투표 집계와 맞지 않습니다.',
    )
  }

  if (diverges && judgment.divergenceReason.trim().length === 0) {
    throw new AgentExecutionError(
      'schema_mismatch',
      '배심원 다수 의견과 다른 판결에는 이유가 필요합니다.',
    )
  }
}
