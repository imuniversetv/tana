import type { AdvocateId, JurorId } from '@/entities/agent'
import type {
  AdvocateClosingContext,
  AdvocateOpeningContext,
  AdvocateRebuttalContext,
  JudgeJudgmentContext,
  JudgeOpeningContext,
  JurorEvaluationContext,
} from '@/entities/trial'

import type { GenerateStructuredContentParams } from '@/shared/api/gemini/generateStructuredContent'

export type RunAgentInput =
  | { agentId: 'judge'; task: 'opening'; context: JudgeOpeningContext }
  | { agentId: 'judge'; task: 'judgment'; context: JudgeJudgmentContext }
  | { agentId: AdvocateId; task: 'opening'; context: AdvocateOpeningContext }
  | { agentId: AdvocateId; task: 'rebuttal'; context: AdvocateRebuttalContext }
  | { agentId: AdvocateId; task: 'closing'; context: AdvocateClosingContext }
  | { agentId: JurorId; task: 'evaluation'; context: JurorEvaluationContext }

export interface RunAgentOptions {
  signal?: AbortSignal
  generate?: <T>(params: GenerateStructuredContentParams<T>) => Promise<T>
}
