import type { AdvocateSide, JurorId } from '@/entities/agent'
import type { CaseAnalysis, CaseCategory } from '@/entities/case'

export interface TrialIssue {
  title: string
  description: string
}

export interface EvaluationCriterion {
  name: string
  description: string
}

export interface ArgumentPoint {
  claim: string
  reasoning: string
}

export interface CounterArgument {
  targetClaim: string
  rebuttal: string
  concession: string
}

export interface TrialStatement {
  side: AdvocateSide
  statement: string
  arguments: ArgumentPoint[]
  counterArguments: CounterArgument[]
  limitations: string[]
}

export interface JuryScore {
  logicalValidity: number
  evidenceReliability: number
  rebuttalResponse: number
  overallPersuasiveness: number
  total: number
}

export type JuryVote = 'pro' | 'con' | 'abstain'

export type Verdict = 'pro' | 'con' | 'undetermined'

export type JuryMajority = 'pro' | 'con' | 'split'

export interface JurorEvaluationResponse {
  pro: JuryScore
  con: JuryScore
  vote: JuryVote
  rationale: string
  perspectiveNotes: string
}

export interface JurorEvaluation extends JurorEvaluationResponse {
  jurorId: JurorId
}

export interface JudgeOpeningResponse {
  statement: string
  issues: TrialIssue[]
  criteria: EvaluationCriterion[]
}

export interface JudgeJudgmentResponse {
  verdict: Verdict
  grounds: string[]
  conditions: string[]
  opinion: string
  juryReview: string
  divergesFromJuryMajority: boolean
  divergenceReason: string
}

export interface AdvocateOpeningResponse {
  statement: string
  arguments: ArgumentPoint[]
  limitations: string[]
}

export interface AdvocateArgumentResponse {
  statement: string
  arguments: ArgumentPoint[]
  counterArguments: CounterArgument[]
  limitations: string[]
}

export interface JudgeOpeningContext {
  originalText: string
  proposition: string
  category: CaseCategory
  topic: string
  analysis: CaseAnalysis
}

export interface AdvocateOpeningContext {
  proposition: string
  issues: TrialIssue[]
}

export interface AdvocateRebuttalContext {
  proposition: string
  issues: TrialIssue[]
  ownOpening: TrialStatement
  opponentOpening: TrialStatement
}

export interface AdvocateClosingContext {
  proposition: string
  proOpening: TrialStatement
  conOpening: TrialStatement
  proRebuttal: TrialStatement
  conRebuttal: TrialStatement
}

export interface JurorEvaluationContext {
  proposition: string
  issues: TrialIssue[]
  proOpening: TrialStatement
  conOpening: TrialStatement
  proRebuttal: TrialStatement
  conRebuttal: TrialStatement
  proClosing: TrialStatement
  conClosing: TrialStatement
}

export interface JudgeJudgmentContext {
  proposition: string
  issues: TrialIssue[]
  criteria: EvaluationCriterion[]
  proOpening: TrialStatement
  conOpening: TrialStatement
  proRebuttal: TrialStatement
  conRebuttal: TrialStatement
  proClosing: TrialStatement
  conClosing: TrialStatement
  juryEvaluations: JurorEvaluation[]
}
