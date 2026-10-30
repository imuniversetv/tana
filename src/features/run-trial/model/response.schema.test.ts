import { describe, expect, it } from 'vitest'
import type { z } from 'zod'

import type {
  AdvocateArgumentResponse,
  AdvocateOpeningResponse,
  JudgeJudgmentResponse,
  JudgeOpeningResponse,
  JurorEvaluationResponse,
} from '@/entities/trial'

import {
  advocateArgumentResponse,
  advocateOpeningResponse,
  alignedJudgment,
  judgeOpeningResponse,
  jurorEvaluationResponse,
  juryScore,
} from './fixtures'
import {
  advocateArgumentResponseSchema,
  advocateOpeningResponseSchema,
  judgeJudgmentResponseSchema,
  judgeOpeningResponseSchema,
  jurorEvaluationResponseSchema,
} from './response.schema'

type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

function assertType<T extends true>() {
  return true as T
}

assertType<Equal<z.infer<typeof judgeOpeningResponseSchema>, JudgeOpeningResponse>>()
assertType<Equal<z.infer<typeof judgeJudgmentResponseSchema>, JudgeJudgmentResponse>>()
assertType<Equal<z.infer<typeof advocateOpeningResponseSchema>, AdvocateOpeningResponse>>()
assertType<Equal<z.infer<typeof advocateArgumentResponseSchema>, AdvocateArgumentResponse>>()
assertType<Equal<z.infer<typeof jurorEvaluationResponseSchema>, JurorEvaluationResponse>>()

describe('agent response schema', () => {
  it('역할별 정상 응답을 통과시킨다', () => {
    expect(judgeOpeningResponseSchema.parse(judgeOpeningResponse()).issues).toHaveLength(2)
    expect(judgeJudgmentResponseSchema.parse(alignedJudgment()).verdict).toBe('pro')
    expect(advocateOpeningResponseSchema.parse(advocateOpeningResponse()).arguments).toHaveLength(2)
    expect(
      advocateArgumentResponseSchema.parse(advocateArgumentResponse()).counterArguments,
    ).toHaveLength(1)
    expect(jurorEvaluationResponseSchema.parse(jurorEvaluationResponse()).vote).toBe('pro')
  })

  it('빈 값과 누락된 필드를 거부한다', () => {
    expect(
      judgeOpeningResponseSchema.safeParse({ ...judgeOpeningResponse(), statement: '   ' }).success,
    ).toBe(false)
    expect(
      judgeOpeningResponseSchema.safeParse({ ...judgeOpeningResponse(), issues: [] }).success,
    ).toBe(false)
    expect(
      advocateOpeningResponseSchema.safeParse({
        statement: advocateOpeningResponse().statement,
        arguments: advocateOpeningResponse().arguments,
      }).success,
    ).toBe(false)
    expect(
      advocateArgumentResponseSchema.safeParse({
        ...advocateArgumentResponse(),
        counterArguments: [],
      }).success,
    ).toBe(false)
  })

  it('판결 결과를 pro, con, undetermined로 제한한다', () => {
    expect(
      judgeJudgmentResponseSchema.safeParse({ ...alignedJudgment(), verdict: 'draw' }).success,
    ).toBe(false)
    expect(
      judgeJudgmentResponseSchema.safeParse({ ...alignedJudgment(), verdict: 'undetermined' })
        .success,
    ).toBe(true)
    expect(
      judgeJudgmentResponseSchema.safeParse({ ...alignedJudgment(), verdict: 'con' }).success,
    ).toBe(true)
  })

  it('배심원 점수 범위와 총점을 검증한다', () => {
    const valid = jurorEvaluationResponse()

    expect(
      jurorEvaluationResponseSchema.safeParse({
        ...valid,
        pro: { ...valid.pro, logicalValidity: 31 },
      }).success,
    ).toBe(false)
    expect(
      jurorEvaluationResponseSchema.safeParse({
        ...valid,
        pro: { ...valid.pro, rebuttalResponse: -1 },
      }).success,
    ).toBe(false)
    expect(
      jurorEvaluationResponseSchema.safeParse({
        ...valid,
        pro: juryScore(24, 21, 14, 16, 99),
      }).success,
    ).toBe(false)
    expect(
      jurorEvaluationResponseSchema.safeParse({
        ...valid,
        con: { ...valid.con, total: 50 },
      }).success,
    ).toBe(false)
    expect(
      jurorEvaluationResponseSchema.safeParse({
        ...valid,
        vote: 'pass',
      }).success,
    ).toBe(false)

    const parsed = jurorEvaluationResponseSchema.parse({ ...valid, extra: 'ignore' })
    expect(parsed).not.toHaveProperty('extra')
    expect(parsed.pro.total).toBe(75)
    expect(parsed.con.total).toBe(51)
  })
})
