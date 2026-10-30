import { z } from 'zod'

import { OUTPUT_LIMITS } from '../config/outputLimits'
import {
  argumentsSchema,
  boundedText,
  counterArgumentSchema,
  criteriaSchema,
  issuesSchema,
  juryScoreSchema,
  limitationsSchema,
  statementTextSchema,
} from './fields.schema'

const limits = OUTPUT_LIMITS

export const judgeOpeningResponseSchema = z.object({
  statement: statementTextSchema,
  issues: issuesSchema,
  criteria: criteriaSchema,
})

export const judgeJudgmentResponseSchema = z.object({
  verdict: z.enum(['pro', 'con', 'undetermined']),
  grounds: z
    .array(boundedText(limits.grounds.text))
    .min(limits.grounds.min, `판단 근거는 ${limits.grounds.min}개 이상이어야 합니다.`)
    .max(limits.grounds.max, `판단 근거는 ${limits.grounds.max}개 이하여야 합니다.`),
  conditions: z
    .array(boundedText(limits.conditions.text))
    .max(limits.conditions.max, `조건은 ${limits.conditions.max}개 이하여야 합니다.`),
  opinion: boundedText(limits.opinion.max, limits.opinion.min),
  juryReview: boundedText(limits.juryReview.max, limits.juryReview.min),
  divergesFromJuryMajority: z.boolean(),
  divergenceReason: z
    .string()
    .trim()
    .max(limits.divergenceReason.max, `${limits.divergenceReason.max}자를 넘을 수 없습니다.`),
})

export const advocateOpeningResponseSchema = z.object({
  statement: statementTextSchema,
  arguments: argumentsSchema,
  limitations: limitationsSchema,
})

export const advocateArgumentResponseSchema = z.object({
  statement: statementTextSchema,
  arguments: argumentsSchema,
  counterArguments: z
    .array(counterArgumentSchema)
    .min(limits.counter.min, '반론을 최소 1개 제시해야 합니다.')
    .max(limits.counter.max, `반론은 ${limits.counter.max}개 이하여야 합니다.`),
  limitations: limitationsSchema,
})

export const jurorEvaluationResponseSchema = z.object({
  pro: juryScoreSchema,
  con: juryScoreSchema,
  vote: z.enum(['pro', 'con', 'abstain']),
  rationale: boundedText(limits.rationale.max, limits.rationale.min),
  perspectiveNotes: boundedText(limits.perspectiveNotes.max, limits.perspectiveNotes.min),
})
