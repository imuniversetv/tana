import { describe, expect, it } from 'vitest'

import { assertJudgmentConsistency } from './assertJudgmentConsistency'
import { AgentExecutionError } from '../model/errors'
import {
  alignedJudgment,
  divergingJudgment,
  judgeJudgmentContext,
  jurorEvaluations,
} from '../model/fixtures'

describe('assertJudgmentConsistency', () => {
  const evaluations = judgeJudgmentContext().juryEvaluations

  it('다수 의견과 같은 판결을 통과시킨다', () => {
    expect(() => assertJudgmentConsistency(alignedJudgment(), evaluations)).not.toThrow()
  })

  it('다수 의견과 다른 판결에 이유가 있으면 통과시킨다', () => {
    expect(divergingJudgment().verdict).toBe('undetermined')
    expect(() => assertJudgmentConsistency(divergingJudgment(), evaluations)).not.toThrow()
  })

  it('차이 표시가 투표 집계와 다르거나 이유가 없으면 거부한다', () => {
    expect(() =>
      assertJudgmentConsistency(
        { ...divergingJudgment(), divergesFromJuryMajority: false },
        evaluations,
      ),
    ).toThrow(AgentExecutionError)
    expect(() =>
      assertJudgmentConsistency({ ...divergingJudgment(), divergenceReason: '   ' }, evaluations),
    ).toThrowError(/이유가 필요/)
  })

  it('과반이 없으면 판결과 다른 다수 의견으로 보지 않는다', () => {
    const split = jurorEvaluations().map((item, index) => ({
      ...item,
      vote: index < 2 ? ('pro' as const) : index < 4 ? ('con' as const) : ('abstain' as const),
    }))

    expect(() =>
      assertJudgmentConsistency(
        { ...alignedJudgment(), verdict: 'undetermined', divergesFromJuryMajority: false },
        split,
      ),
    ).not.toThrow()
    expect(() =>
      assertJudgmentConsistency(
        { ...alignedJudgment(), verdict: 'undetermined', divergesFromJuryMajority: true },
        split,
      ),
    ).toThrow(AgentExecutionError)
  })
})
