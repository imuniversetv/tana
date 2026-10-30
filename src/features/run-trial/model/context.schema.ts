import { z } from 'zod'

import type { AdvocateSide } from '@/entities/agent'
import { JUROR_IDS } from '@/entities/agent'

import { OUTPUT_LIMITS } from '../config/outputLimits'
import {
  boundedText,
  criteriaSchema,
  issuesSchema,
  juryScoreSchema,
  propositionSchema,
  trialStatementSchema,
} from './fields.schema'

const limits = OUTPUT_LIMITS

const caseCategorySchema = z.enum(['ui', 'ux', 'publishing', 'frontend', 'design-system', 'other'])

const caseAnalysisSchema = z.object({
  status: z.enum(['accepted', 'out_of_scope', 'not_debatable', 'needs_clarification']),
  category: caseCategorySchema,
  topic: boundedText(limits.topic.max),
  proposition: propositionSchema,
  reason: boundedText(2000),
})

export const judgeOpeningContextSchema = z
  .object({
    originalText: boundedText(limits.originalText.max),
    proposition: propositionSchema,
    category: caseCategorySchema,
    topic: boundedText(limits.topic.max),
    analysis: caseAnalysisSchema,
  })
  .refine((data) => data.analysis.status === 'accepted', {
    message: '재판은 검증을 통과한 논제만 개시할 수 있습니다.',
    path: ['analysis', 'status'],
  })
  .refine((data) => data.category !== 'other' && data.analysis.category !== 'other', {
    message: '분야가 확정된 논제만 재판을 개시할 수 있습니다.',
    path: ['category'],
  })
  .refine((data) => data.category === data.analysis.category, {
    message: '분야가 논제 분석 결과와 일치해야 합니다.',
    path: ['category'],
  })
  .refine((data) => data.topic === data.analysis.topic, {
    message: '주제가 논제 분석 결과와 일치해야 합니다.',
    path: ['topic'],
  })
  .refine((data) => data.proposition === data.analysis.proposition, {
    message: '정규화된 논제가 논제 분석 결과와 일치해야 합니다.',
    path: ['proposition'],
  })

export const advocateOpeningContextSchema = z.object({
  proposition: propositionSchema,
  issues: issuesSchema,
})

export function advocateRebuttalContextSchema(side: AdvocateSide) {
  const opponent: AdvocateSide = side === 'pro' ? 'con' : 'pro'

  return z
    .object({
      proposition: propositionSchema,
      issues: issuesSchema,
      ownOpening: trialStatementSchema,
      opponentOpening: trialStatementSchema,
    })
    .refine((data) => data.ownOpening.side === side && data.opponentOpening.side === opponent, {
      message: '자신의 모두변론과 상대 모두변론이 담당 입장과 맞아야 합니다.',
    })
}

const pleadingsSchema = {
  proposition: propositionSchema,
  proOpening: trialStatementSchema,
  conOpening: trialStatementSchema,
  proRebuttal: trialStatementSchema,
  conRebuttal: trialStatementSchema,
}

function pleadingsMatchSides(data: {
  proOpening: { side: AdvocateSide }
  conOpening: { side: AdvocateSide }
  proRebuttal: { side: AdvocateSide }
  conRebuttal: { side: AdvocateSide }
  proClosing?: { side: AdvocateSide }
  conClosing?: { side: AdvocateSide }
}): boolean {
  const openingsMatch =
    data.proOpening.side === 'pro' &&
    data.conOpening.side === 'con' &&
    data.proRebuttal.side === 'pro' &&
    data.conRebuttal.side === 'con'

  if (!data.proClosing && !data.conClosing) return openingsMatch
  if (!data.proClosing || !data.conClosing) return false

  return openingsMatch && data.proClosing.side === 'pro' && data.conClosing.side === 'con'
}

export const advocateClosingContextSchema = z
  .object(pleadingsSchema)
  .refine(pleadingsMatchSides, { message: '변론의 입장이 필드와 맞아야 합니다.' })

export const jurorEvaluationContextSchema = z
  .object({
    ...pleadingsSchema,
    issues: issuesSchema,
    proClosing: trialStatementSchema,
    conClosing: trialStatementSchema,
  })
  .refine(pleadingsMatchSides, { message: '변론의 입장이 필드와 맞아야 합니다.' })

export const jurorEvaluationRecordSchema = z.object({
  jurorId: z.enum(JUROR_IDS),
  pro: juryScoreSchema,
  con: juryScoreSchema,
  vote: z.enum(['pro', 'con', 'abstain']),
  rationale: boundedText(limits.rationale.max, limits.rationale.min),
  perspectiveNotes: boundedText(limits.perspectiveNotes.max, limits.perspectiveNotes.min),
})

export const judgeJudgmentContextSchema = z
  .object({
    proposition: propositionSchema,
    issues: issuesSchema,
    criteria: criteriaSchema,
    proOpening: trialStatementSchema,
    conOpening: trialStatementSchema,
    proRebuttal: trialStatementSchema,
    conRebuttal: trialStatementSchema,
    proClosing: trialStatementSchema,
    conClosing: trialStatementSchema,
    juryEvaluations: z
      .array(jurorEvaluationRecordSchema)
      .length(5, '배심원 5명의 평가가 필요합니다.'),
  })
  .refine(pleadingsMatchSides, { message: '변론의 입장이 필드와 맞아야 합니다.' })
  .refine(
    (data) => new Set(data.juryEvaluations.map((item) => item.jurorId)).size === JUROR_IDS.length,
    {
      message: '배심원 5명의 평가가 각각 한 번씩 필요합니다.',
      path: ['juryEvaluations'],
    },
  )
