import { z } from 'zod'

export const caseAnalysisSchema = z
  .object({
    status: z.enum(['accepted', 'out_of_scope', 'not_debatable', 'needs_clarification']),
    category: z.enum(['ui', 'ux', 'publishing', 'frontend', 'design-system', 'other']),
    topic: z.string(),
    proposition: z.string(),
    reason: z.string(),
  })
  .refine(
    (data) =>
      data.status !== 'accepted' ||
      (data.topic.trim().length > 0 && data.proposition.trim().length > 0),
    {
      message: '재판 가능한 논제에는 주제와 정규화된 논제가 필요합니다.',
    },
  )
