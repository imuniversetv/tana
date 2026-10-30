import type { AgentId, AgentRole } from '@/entities/agent'
import type { CaseAnalysis, CaseCategory } from '@/entities/case'
import type {
  AdvocateArgumentResponse,
  AdvocateOpeningResponse,
  JudgeJudgmentResponse,
  JudgeOpeningResponse,
  JurorEvaluation,
  JuryAggregate,
  TrialStatement,
} from '@/entities/trial'

export type TrialStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled'

export type TrialPhase =
  'opening' | 'statements' | 'rebuttals' | 'closings' | 'jury-deliberation' | 'judgment'

export type TrialErrorKind =
  | 'network'
  | 'rate_limit'
  | 'empty_response'
  | 'invalid_json'
  | 'schema_mismatch'
  | 'unexpected'
  | 'cancelled'
  | 'invalid_input'
  | 'duplicate'

export interface TrialFailure {
  kind: TrialErrorKind
  message: string
  phase: TrialPhase | null
  agentId?: AgentId
}

export interface TrialAgentError {
  agentId: AgentId
  kind: TrialErrorKind
  message: string
}

export interface TrialMessage {
  id: string
  trialId: string
  agentId: AgentId
  role: AgentRole
  phase: TrialPhase
  content: string
  createdAt: string
  order: number
}

export interface TrialRecord {
  id: string
  originalText: string
  proposition: string
  category: CaseCategory
  topic: string
  analysis: CaseAnalysis
  status: TrialStatus
  phase: TrialPhase | null
  opening: JudgeOpeningResponse | null
  proOpening: TrialStatement | null
  conOpening: TrialStatement | null
  proRebuttal: TrialStatement | null
  conRebuttal: TrialStatement | null
  proClosing: TrialStatement | null
  conClosing: TrialStatement | null
  juryEvaluations: JurorEvaluation[]
  juryAggregate: JuryAggregate | null
  judgment: JudgeJudgmentResponse | null
  messages: TrialMessage[]
  agentErrors: TrialAgentError[]
  error: TrialFailure | null
  startedAt: string
  finishedAt: string | null
}

export type TrialAgentResult =
  | JudgeOpeningResponse
  | AdvocateOpeningResponse
  | AdvocateArgumentResponse
  | JurorEvaluation
  | JudgeJudgmentResponse

export type TrialEvent =
  | { type: 'trial.started'; trialId: string }
  | { type: 'phase.started'; trialId: string; phase: TrialPhase }
  | { type: 'agent.started'; trialId: string; phase: TrialPhase; agentId: AgentId }
  | {
      type: 'agent.completed'
      trialId: string
      phase: TrialPhase
      agentId: AgentId
      message: TrialMessage
      result: TrialAgentResult
    }
  | { type: 'phase.completed'; trialId: string; phase: TrialPhase }
  | { type: 'trial.completed'; trialId: string; record: TrialRecord }
  | { type: 'trial.failed'; trialId: string; phase: TrialPhase; error: TrialFailure }
  | { type: 'trial.cancelled'; trialId: string; phase: TrialPhase | null }

export const TRIAL_PHASES = [
  'opening',
  'statements',
  'rebuttals',
  'closings',
  'jury-deliberation',
  'judgment',
] as const satisfies readonly TrialPhase[]
