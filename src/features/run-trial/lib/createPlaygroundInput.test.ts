import { describe, expect, it } from 'vitest'

import { acceptedAnalysis, PROPOSITION } from '../model/fixtures'
import { createPlaygroundRequest } from './createPlaygroundInput'

describe('createPlaygroundRequest', () => {
  it('통과한 논제 분석으로 재판 개시를 만든다', () => {
    const analysis = {
      ...acceptedAnalysis(),
      proposition: '포커스 링을 제거하면 키보드 사용성이 나빠진다.',
      topic: '포커스 링',
    }
    const request = createPlaygroundRequest('judge', 'opening', {
      originalText: '포커스 링은 빼지 마세요.',
      analysis,
    })

    expect(request.sourceLabel).toBe('위에서 통과한 논제')
    expect(request.input).toMatchObject({
      agentId: 'judge',
      task: 'opening',
      context: {
        originalText: '포커스 링은 빼지 마세요.',
        proposition: analysis.proposition,
        analysis,
      },
    })
  })

  it('통과하지 않은 분석이면 재판 개시에 샘플 논제를 쓴다', () => {
    const request = createPlaygroundRequest('judge', 'opening', {
      originalText: '오늘 날씨',
      analysis: { ...acceptedAnalysis(), status: 'out_of_scope', category: 'other' },
    })

    expect(request.sourceLabel).toBe('샘플 재판 기록')
    expect(request.input).toMatchObject({
      context: { proposition: PROPOSITION },
    })
  })

  it('변호사 반론은 담당 입장과 샘플 기록을 맞춘다', () => {
    const pro = createPlaygroundRequest('pro-advocate', 'rebuttal', null)
    const con = createPlaygroundRequest('con-advocate', 'rebuttal', null)

    expect(pro.input).toMatchObject({
      agentId: 'pro-advocate',
      context: { ownOpening: { side: 'pro' }, opponentOpening: { side: 'con' } },
    })
    expect(con.input).toMatchObject({
      agentId: 'con-advocate',
      context: { ownOpening: { side: 'con' }, opponentOpening: { side: 'pro' } },
    })
  })

  it('배심원 평가 입력에 다른 배심원 결과를 넣지 않는다', () => {
    const request = createPlaygroundRequest('juror-evidence', 'evaluation', null)

    expect(request.input.task).toBe('evaluation')
    expect(request.input).not.toHaveProperty('context.juryEvaluations')
    expect(JSON.stringify(request.input.context)).not.toContain('juror-logic')
  })
})
