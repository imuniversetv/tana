import { describe, expect, it } from 'vitest'

import { aggregateJury, JURY_RUBRIC, JURY_TOTAL_MAX, summarizeJuryVotes } from '@/entities/trial'
import type { JurorEvaluation } from '@/entities/trial'

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

describe('aggregateJury', () => {
  it('투표 수와 항목 합계의 평균을 계산한다', () => {
    const aggregate = aggregateJury([
      evaluation('juror-logic', 'pro', 70, 50),
      evaluation('juror-evidence', 'con', 40, 80),
    ])

    expect(aggregate).toMatchObject({
      proVotes: 1,
      conVotes: 1,
      abstainVotes: 0,
      majority: 'split',
      proAverageScore: 55,
      conAverageScore: 65,
      mismatches: [],
    })
  })

  it('보고된 총점이 항목 합과 다르면 불일치를 남긴다', () => {
    const sample = evaluation('juror-practicality', 'abstain', 60, 60)
    sample.pro.total = 10

    expect(aggregateJury([sample]).mismatches).toEqual([
      {
        jurorId: 'juror-practicality',
        side: 'pro',
        reportedTotal: 10,
        calculatedTotal: 60,
      },
    ])
  })

  it('배점을 넘는 항목을 불일치로 본다', () => {
    const sample = evaluation('juror-user-experience', 'pro', 60, 60)
    sample.con.logicalValidity = 31

    expect(aggregateJury([sample]).mismatches[0]).toMatchObject({
      jurorId: 'juror-user-experience',
      side: 'con',
    })
  })
})

function evaluation(
  jurorId: JurorEvaluation['jurorId'],
  vote: JurorEvaluation['vote'],
  proTotal: number,
  conTotal: number,
): JurorEvaluation {
  return {
    jurorId,
    vote,
    rationale: '평가',
    perspectiveNotes: '관점',
    pro: score(proTotal),
    con: score(conTotal),
  }
}

function score(total: number): JurorEvaluation['pro'] {
  const logicalValidity = Math.min(30, total)
  const evidenceReliability = Math.min(30, total - logicalValidity)
  const rebuttalResponse = Math.min(20, total - logicalValidity - evidenceReliability)
  const overallPersuasiveness = total - logicalValidity - evidenceReliability - rebuttalResponse

  return {
    logicalValidity,
    evidenceReliability,
    rebuttalResponse,
    overallPersuasiveness,
    total,
  }
}
