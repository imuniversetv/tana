import { getAgent } from '@/entities/agent'
import type { AgentId } from '@/entities/agent'
import type { CaseAnalysis } from '@/entities/case'

import {
  advocateClosingContext,
  advocateOpeningContext,
  advocateRebuttalContext,
  judgeJudgmentContext,
  judgeOpeningContext,
  jurorEvaluationContext,
} from '../model/fixtures'
import type { RunAgentInput } from '../model/runAgent.types'
import type { AgentTask } from './validateAgentTask'

export interface PlaygroundSource {
  originalText: string
  analysis: CaseAnalysis
}

export interface PlaygroundRequest {
  input: RunAgentInput
  sourceLabel: string
}

const SAMPLE_LABEL = '샘플 재판 기록'
const LIVE_LABEL = '위에서 통과한 논제'

export function createPlaygroundRequest(
  agentId: AgentId,
  task: AgentTask,
  source: PlaygroundSource | null,
): PlaygroundRequest {
  if (agentId === 'judge' && task === 'opening') {
    const live = liveOpeningContext(source)

    if (live) {
      return {
        sourceLabel: LIVE_LABEL,
        input: { agentId, task, context: live },
      }
    }

    return {
      sourceLabel: SAMPLE_LABEL,
      input: { agentId, task, context: judgeOpeningContext() },
    }
  }

  if (agentId === 'judge' && task === 'judgment') {
    return {
      sourceLabel: SAMPLE_LABEL,
      input: { agentId, task, context: judgeJudgmentContext() },
    }
  }

  if (agentId === 'pro-advocate' || agentId === 'con-advocate') {
    if (task === 'opening') {
      return {
        sourceLabel: SAMPLE_LABEL,
        input: { agentId, task, context: advocateOpeningContext() },
      }
    }

    if (task === 'rebuttal') {
      return {
        sourceLabel: SAMPLE_LABEL,
        input: {
          agentId,
          task,
          context: advocateRebuttalContext(getAgent(agentId).side),
        },
      }
    }

    if (task === 'closing') {
      return {
        sourceLabel: SAMPLE_LABEL,
        input: { agentId, task, context: advocateClosingContext() },
      }
    }
  }

  if (
    task === 'evaluation' &&
    agentId !== 'judge' &&
    agentId !== 'pro-advocate' &&
    agentId !== 'con-advocate'
  ) {
    return {
      sourceLabel: SAMPLE_LABEL,
      input: { agentId, task, context: jurorEvaluationContext() },
    }
  }

  throw new Error('이 화면에서 실행할 수 없는 Agent 작업입니다.')
}

function liveOpeningContext(source: PlaygroundSource | null) {
  if (!source) return null

  const { analysis, originalText } = source
  const ready =
    analysis.status === 'accepted' &&
    analysis.category !== 'other' &&
    analysis.proposition.trim().length > 0 &&
    analysis.topic.trim().length > 0 &&
    originalText.trim().length > 0

  if (!ready) return null

  return {
    originalText: originalText.trim(),
    proposition: analysis.proposition,
    category: analysis.category,
    topic: analysis.topic,
    analysis,
  }
}
