import { describe, expect, it } from 'vitest'

import { JURY_RUBRIC, JURY_TOTAL_MAX, summarizeJuryVotes } from '@/entities/trial'

describe('jury tally', () => {
  it('평가 배점의 합은 100점이다', () => {
    expect(JURY_RUBRIC.map((item) => item.key)).toEqual([
      'logicalValidity',
      'evidenceReliability',
      'rebuttalResponse',
      'overallPersuasiveness',
    ])
    expect(JURY_RUBRIC.reduce((sum, item) => sum + item.maxScore, 0)).toBe(JURY_TOTAL_MAX)
  })

  it('3표 이상이고 상대보다 많은 쪽을 다수 의견으로 본다', () => {
    expect(summarizeJuryVotes(['pro', 'pro', 'pro', 'con', 'con']).majority).toBe('pro')
    expect(summarizeJuryVotes(['con', 'con', 'con', 'pro', 'abstain'])).toEqual({
      pro: 1,
      con: 3,
      abstain: 1,
      majority: 'con',
    })
    expect(summarizeJuryVotes(['pro', 'pro', 'pro', 'pro', 'con']).majority).toBe('pro')
  })

  it('어느 쪽도 3표 미만이면 다수 의견이 없다', () => {
    expect(summarizeJuryVotes(['pro', 'pro', 'con', 'con', 'abstain']).majority).toBe('split')
    expect(summarizeJuryVotes(['pro', 'pro', 'con', 'abstain', 'abstain']).majority).toBe('split')
    expect(
      summarizeJuryVotes(['abstain', 'abstain', 'abstain', 'abstain', 'abstain']).majority,
    ).toBe('split')
  })
})
