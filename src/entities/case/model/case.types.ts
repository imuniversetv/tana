export type CaseAnalysisStatus =
  'accepted' | 'out_of_scope' | 'not_debatable' | 'needs_clarification'

export type CaseCategory = 'ui' | 'ux' | 'publishing' | 'frontend' | 'design-system' | 'other'

export interface CaseAnalysis {
  status: CaseAnalysisStatus
  category: CaseCategory
  topic: string
  proposition: string
  reason: string
}
