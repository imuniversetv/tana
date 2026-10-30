import { z } from 'zod'

import { JURY_RUBRIC, JURY_TOTAL_MAX } from '@/entities/trial'

import { OUTPUT_LIMITS } from '../config/outputLimits'

const limits = OUTPUT_LIMITS

function rubricMax(key: (typeof JURY_RUBRIC)[number]['key']): number {
  const item = JURY_RUBRIC.find((entry) => entry.key === key)

  if (!item) {
    throw new Error(`배심원 평가 항목이 없습니다: ${key}`)
  }

  return item.maxScore
}

function text(max: number, min = 1) {
  return z
    .string()
    .trim()
    .min(min, min === 1 ? '값을 입력해야 합니다.' : `${min}자 이상이어야 합니다.`)
    .max(max, `${max}자를 넘을 수 없습니다.`)
}

function scoreField(key: (typeof JURY_RUBRIC)[number]['key']) {
  const max = rubricMax(key)

  return z
    .number()
    .int('점수는 정수여야 합니다.')
    .min(0, '점수는 0 이상이어야 합니다.')
    .max(max, `점수는 ${max}점 이하여야 합니다.`)
}

export const advocateSideSchema = z.enum(['pro', 'con'])

export const juryScoreSchema = z
  .object({
    logicalValidity: scoreField('logicalValidity'),
    evidenceReliability: scoreField('evidenceReliability'),
    rebuttalResponse: scoreField('rebuttalResponse'),
    overallPersuasiveness: scoreField('overallPersuasiveness'),
    total: z
      .number()
      .int('총점은 정수여야 합니다.')
      .min(0, '총점은 0 이상이어야 합니다.')
      .max(JURY_TOTAL_MAX, `총점은 ${JURY_TOTAL_MAX}점 이하여야 합니다.`),
  })
  .refine(
    (score) =>
      score.total ===
      score.logicalValidity +
        score.evidenceReliability +
        score.rebuttalResponse +
        score.overallPersuasiveness,
    { message: '총점은 항목별 점수의 합계와 같아야 합니다.', path: ['total'] },
  )

export const trialIssueSchema = z.object({
  title: text(limits.issue.title),
  description: text(limits.issue.description),
})

export const evaluationCriterionSchema = z.object({
  name: text(limits.criterion.name),
  description: text(limits.criterion.description),
})

export const argumentPointSchema = z.object({
  claim: text(limits.claim.max),
  reasoning: text(limits.reasoning.max),
})

export const counterArgumentSchema = z.object({
  targetClaim: text(limits.claim.max),
  rebuttal: text(limits.counterText.max),
  concession: text(limits.concession.max),
})

export const limitationsSchema = z
  .array(text(limits.limitation.text))
  .min(limits.limitation.min, '한계를 밝혀야 합니다.')
  .max(limits.limitation.max, `한계는 ${limits.limitation.max}개 이하여야 합니다.`)

export const argumentsSchema = z
  .array(argumentPointSchema)
  .min(limits.argument.min, `주장은 ${limits.argument.min}개 이상이어야 합니다.`)
  .max(limits.argument.max, `주장은 ${limits.argument.max}개 이하여야 합니다.`)

export const statementTextSchema = text(limits.statement.max, limits.statement.min)

export const propositionSchema = text(limits.proposition.max)

export const issuesSchema = z
  .array(trialIssueSchema)
  .min(limits.issue.min, `쟁점은 ${limits.issue.min}개 이상이어야 합니다.`)
  .max(limits.issue.max, `쟁점은 ${limits.issue.max}개 이하여야 합니다.`)

export const criteriaSchema = z
  .array(evaluationCriterionSchema)
  .min(limits.criterion.min, `평가 기준은 ${limits.criterion.min}개 이상이어야 합니다.`)
  .max(limits.criterion.max, `평가 기준은 ${limits.criterion.max}개 이하여야 합니다.`)

export const trialStatementSchema = z.object({
  side: advocateSideSchema,
  statement: statementTextSchema,
  arguments: argumentsSchema,
  counterArguments: z
    .array(counterArgumentSchema)
    .max(limits.counter.max, `반론은 ${limits.counter.max}개 이하여야 합니다.`),
  limitations: limitationsSchema,
})

export const boundedText = text
