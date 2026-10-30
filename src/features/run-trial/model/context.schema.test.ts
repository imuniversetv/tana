import { describe, expect, it } from 'vitest'
import type { z } from 'zod'

import type { JurorEvaluationContext } from '@/entities/trial'

import {
  advocateClosingContext,
  advocateOpeningContext,
  advocateRebuttalContext,
  judgeJudgmentContext,
  judgeOpeningContext,
  jurorEvaluationContext,
  jurorEvaluations,
} from './fixtures'
import {
  advocateClosingContextSchema,
  advocateOpeningContextSchema,
  advocateRebuttalContextSchema,
  judgeJudgmentContextSchema,
  judgeOpeningContextSchema,
  jurorEvaluationContextSchema,
} from './context.schema'

type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

function assertType<T extends true>() {
  return true as T
}

type JurorContextHasOtherVotes = 'juryEvaluations' extends keyof JurorEvaluationContext
  ? true
  : false

assertType<JurorContextHasOtherVotes extends false ? true : false>()
assertType<
  Equal<z.infer<typeof judgeOpeningContextSchema>, ReturnType<typeof judgeOpeningContext>>
>()
assertType<
  Equal<z.infer<typeof jurorEvaluationContextSchema>, ReturnType<typeof jurorEvaluationContext>>
>()

describe('agent context schema', () => {
  it('검증된 논제로 재판 개시를 허용한다', () => {
    expect(judgeOpeningContextSchema.parse(judgeOpeningContext()).proposition).toBe(
      judgeOpeningContext().proposition,
    )
    expect(advocateOpeningContextSchema.parse(advocateOpeningContext()).issues).toHaveLength(2)
    expect(
      advocateRebuttalContextSchema('pro').parse(advocateRebuttalContext('pro')).ownOpening.side,
    ).toBe('pro')
    expect(advocateClosingContextSchema.parse(advocateClosingContext()).conRebuttal.side).toBe(
      'con',
    )
    expect(jurorEvaluationContextSchema.parse(jurorEvaluationContext()).proClosing.side).toBe('pro')
    expect(judgeJudgmentContextSchema.parse(judgeJudgmentContext()).juryEvaluations).toHaveLength(5)
  })

  it('검증 전 논제와 불일치한 분석 결과를 거부한다', () => {
    const context = judgeOpeningContext()

    expect(
      judgeOpeningContextSchema.safeParse({
        ...context,
        analysis: { ...context.analysis, status: 'out_of_scope' },
      }).success,
    ).toBe(false)
    expect(
      judgeOpeningContextSchema.safeParse({
        ...context,
        proposition: '버튼 대비는 항상 본문보다 높아야 한다.',
      }).success,
    ).toBe(false)
    expect(
      judgeOpeningContextSchema.safeParse({
        ...context,
        category: 'other',
        analysis: { ...context.analysis, category: 'other' },
      }).success,
    ).toBe(false)
  })

  it('담당 입장과 다른 변론 입력을 거부한다', () => {
    const context = advocateRebuttalContext('pro')

    expect(
      advocateRebuttalContextSchema('pro').safeParse({
        ...context,
        ownOpening: { ...context.ownOpening, side: 'con' },
      }).success,
    ).toBe(false)
    expect(advocateRebuttalContextSchema('con').safeParse(context).success).toBe(false)
  })

  it('배심원 5명의 평가가 빠지거나 중복되면 판결 입력을 거부한다', () => {
    const context = judgeJudgmentContext()

    expect(
      judgeJudgmentContextSchema.safeParse({
        ...context,
        juryEvaluations: context.juryEvaluations.slice(0, 4),
      }).success,
    ).toBe(false)
    expect(
      judgeJudgmentContextSchema.safeParse({
        ...context,
        juryEvaluations: context.juryEvaluations.map((item) => ({
          ...item,
          jurorId: 'juror-logic',
        })),
      }).success,
    ).toBe(false)
    expect(jurorEvaluations().map((item) => item.jurorId)).toHaveLength(5)
  })

  it('배심원 입력 스키마에 다른 배심원 평가 필드가 없다', () => {
    const parsed = jurorEvaluationContextSchema.parse(jurorEvaluationContext())

    expect(Object.keys(parsed)).not.toContain('juryEvaluations')
    expect(JSON.stringify(parsed)).not.toContain('juror-logic')
  })
})
