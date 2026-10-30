import type { AdvocateSide } from '@/entities/agent'
import type {
  AdvocateArgumentResponse,
  AdvocateOpeningResponse,
  TrialStatement,
} from '@/entities/trial'

export function toTrialStatement(
  response: AdvocateOpeningResponse | AdvocateArgumentResponse,
  side: AdvocateSide,
): TrialStatement {
  return {
    side,
    statement: response.statement,
    arguments: response.arguments,
    counterArguments: 'counterArguments' in response ? response.counterArguments : [],
    limitations: response.limitations,
  }
}
