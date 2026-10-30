import { z } from 'zod'

import { getAgent } from '@/entities/agent'
import type { AdvocateId, JurorId } from '@/entities/agent'
import type {
  AdvocateArgumentResponse,
  AdvocateClosingContext,
  AdvocateOpeningContext,
  AdvocateOpeningResponse,
  AdvocateRebuttalContext,
  JudgeJudgmentContext,
  JudgeJudgmentResponse,
  JudgeOpeningContext,
  JudgeOpeningResponse,
  JurorEvaluation,
  JurorEvaluationContext,
} from '@/entities/trial'
import type { Schema } from 'firebase/ai'

import { generateStructuredContent } from '@/shared/api/gemini/generateStructuredContent'
import { StructuredContentError } from '@/shared/api/gemini/errors'

import { assertJudgmentConsistency } from '../lib/assertJudgmentConsistency'
import { buildAgentPrompt } from '../lib/buildAgentPrompt'
import { isSupportedTask, SUPPORTED_TASKS } from '../lib/validateAgentTask'
import { MAX_OUTPUT_TOKENS } from '../config/outputLimits'
import {
  advocateClosingContextSchema,
  advocateOpeningContextSchema,
  advocateRebuttalContextSchema,
  judgeJudgmentContextSchema,
  judgeOpeningContextSchema,
  jurorEvaluationContextSchema,
} from '../model/context.schema'
import { AgentExecutionError, formatZodIssues } from '../model/errors'
import {
  advocateArgumentGeminiSchema,
  advocateOpeningGeminiSchema,
  judgeJudgmentGeminiSchema,
  judgeOpeningGeminiSchema,
  jurorEvaluationGeminiSchema,
} from '../model/response.gemini'
import {
  advocateArgumentResponseSchema,
  advocateOpeningResponseSchema,
  judgeJudgmentResponseSchema,
  judgeOpeningResponseSchema,
  jurorEvaluationResponseSchema,
} from '../model/response.schema'
import type { RunAgentInput, RunAgentOptions } from '../model/runAgent.types'

export async function runAgent(
  input: { agentId: 'judge'; task: 'opening'; context: JudgeOpeningContext },
  options?: RunAgentOptions,
): Promise<JudgeOpeningResponse>
export async function runAgent(
  input: { agentId: 'judge'; task: 'judgment'; context: JudgeJudgmentContext },
  options?: RunAgentOptions,
): Promise<JudgeJudgmentResponse>
export async function runAgent(
  input: { agentId: AdvocateId; task: 'opening'; context: AdvocateOpeningContext },
  options?: RunAgentOptions,
): Promise<AdvocateOpeningResponse>
export async function runAgent(
  input: { agentId: AdvocateId; task: 'rebuttal'; context: AdvocateRebuttalContext },
  options?: RunAgentOptions,
): Promise<AdvocateArgumentResponse>
export async function runAgent(
  input: { agentId: AdvocateId; task: 'closing'; context: AdvocateClosingContext },
  options?: RunAgentOptions,
): Promise<AdvocateArgumentResponse>
export async function runAgent(
  input: { agentId: JurorId; task: 'evaluation'; context: JurorEvaluationContext },
  options?: RunAgentOptions,
): Promise<JurorEvaluation>
export async function runAgent(
  input: RunAgentInput,
  options?: RunAgentOptions,
): Promise<
  | JudgeOpeningResponse
  | JudgeJudgmentResponse
  | AdvocateOpeningResponse
  | AdvocateArgumentResponse
  | JurorEvaluation
>
export async function runAgent(
  input: RunAgentInput,
  options?: RunAgentOptions,
): Promise<
  | JudgeOpeningResponse
  | JudgeJudgmentResponse
  | AdvocateOpeningResponse
  | AdvocateArgumentResponse
  | JurorEvaluation
> {
  if (options?.signal?.aborted) {
    throw new AgentExecutionError('aborted', '요청이 중단되었습니다.')
  }

  const agent = getAgent(input.agentId)

  if (!isSupportedTask(agent.role, input.task)) {
    throw new AgentExecutionError(
      'unsupported_task',
      `${agent.name}에게 요청한 작업은 지원되지 않습니다. 지원 작업: ${SUPPORTED_TASKS[agent.role].join(', ')}`,
    )
  }

  if (input.agentId === 'judge' && input.task === 'opening') {
    return runJudgeOpening(input.context, options)
  }

  if (input.agentId === 'judge' && input.task === 'judgment') {
    return runJudgeJudgment(input.context, options)
  }

  if (input.task === 'opening') {
    return runAdvocateOpening(input.agentId, input.context, options)
  }

  if (input.task === 'rebuttal') {
    return runAdvocateRebuttal(input.agentId, input.context, options)
  }

  if (input.task === 'closing') {
    return runAdvocateClosing(input.agentId, input.context, options)
  }

  return runJurorEvaluation(input.agentId, input.context, options)
}

async function runJudgeOpening(
  context: JudgeOpeningContext,
  options: RunAgentOptions | undefined,
): Promise<JudgeOpeningResponse> {
  const parsed = parseContext(judgeOpeningContextSchema, context)
  const prompt = buildAgentPrompt(getAgent('judge'), 'opening', parsed)

  return execute(
    prompt,
    judgeOpeningGeminiSchema,
    judgeOpeningResponseSchema,
    MAX_OUTPUT_TOKENS.opening,
    options,
  )
}

async function runJudgeJudgment(
  context: JudgeJudgmentContext,
  options: RunAgentOptions | undefined,
): Promise<JudgeJudgmentResponse> {
  const parsed = parseContext(judgeJudgmentContextSchema, context)
  const prompt = buildAgentPrompt(getAgent('judge'), 'judgment', parsed)
  const judgment = await execute(
    prompt,
    judgeJudgmentGeminiSchema,
    judgeJudgmentResponseSchema,
    MAX_OUTPUT_TOKENS.judgment,
    options,
  )

  assertJudgmentConsistency(judgment, parsed.juryEvaluations)
  return judgment
}

async function runAdvocateOpening(
  agentId: AdvocateId,
  context: AdvocateOpeningContext,
  options: RunAgentOptions | undefined,
): Promise<AdvocateOpeningResponse> {
  const parsed = parseContext(advocateOpeningContextSchema, context)
  const prompt = buildAgentPrompt(getAgent(agentId), 'opening', parsed)

  return execute(
    prompt,
    advocateOpeningGeminiSchema,
    advocateOpeningResponseSchema,
    MAX_OUTPUT_TOKENS.opening,
    options,
  )
}

async function runAdvocateRebuttal(
  agentId: AdvocateId,
  context: AdvocateRebuttalContext,
  options: RunAgentOptions | undefined,
): Promise<AdvocateArgumentResponse> {
  const agent = getAgent(agentId)
  const parsed = parseContext(advocateRebuttalContextSchema(agent.side), context)
  const prompt = buildAgentPrompt(agent, 'rebuttal', parsed)

  return execute(
    prompt,
    advocateArgumentGeminiSchema,
    advocateArgumentResponseSchema,
    MAX_OUTPUT_TOKENS.rebuttal,
    options,
  )
}

async function runAdvocateClosing(
  agentId: AdvocateId,
  context: AdvocateClosingContext,
  options: RunAgentOptions | undefined,
): Promise<AdvocateArgumentResponse> {
  const parsed = parseContext(advocateClosingContextSchema, context)
  const prompt = buildAgentPrompt(getAgent(agentId), 'closing', parsed)

  return execute(
    prompt,
    advocateArgumentGeminiSchema,
    advocateArgumentResponseSchema,
    MAX_OUTPUT_TOKENS.closing,
    options,
  )
}

async function runJurorEvaluation(
  agentId: JurorId,
  context: JurorEvaluationContext,
  options: RunAgentOptions | undefined,
): Promise<JurorEvaluation> {
  const parsed = parseContext(jurorEvaluationContextSchema, context)
  const prompt = buildAgentPrompt(getAgent(agentId), 'evaluation', parsed)
  const response = await execute(
    prompt,
    jurorEvaluationGeminiSchema,
    jurorEvaluationResponseSchema,
    MAX_OUTPUT_TOKENS.evaluation,
    options,
  )

  return { ...response, jurorId: agentId }
}

async function execute<T>(
  prompt: { systemInstruction: string; userPrompt: string },
  responseSchema: Schema,
  zodSchema: z.ZodType<T>,
  maxOutputTokens: number,
  options: RunAgentOptions | undefined,
): Promise<T> {
  const generate = options?.generate ?? generateStructuredContent

  try {
    const raw = await generate({
      systemInstruction: prompt.systemInstruction,
      prompt: prompt.userPrompt,
      responseSchema,
      zodSchema,
      signal: options?.signal,
      maxOutputTokens,
    })
    const parsed = zodSchema.safeParse(raw)

    if (!parsed.success) {
      throw new AgentExecutionError(
        'schema_mismatch',
        `Gemini 응답이 스키마와 일치하지 않습니다. ${formatZodIssues(parsed.error)}`,
        parsed.error,
      )
    }

    return parsed.data
  } catch (error) {
    if (error instanceof AgentExecutionError) throw error

    if (error instanceof StructuredContentError) {
      throw new AgentExecutionError(error.code, error.message, error)
    }

    throw new AgentExecutionError('request_failed', 'Agent 실행에 실패했습니다.', error)
  }
}

function parseContext<T>(schema: z.ZodType<T>, context: unknown): T {
  const result = schema.safeParse(context)

  if (!result.success) {
    throw new AgentExecutionError(
      'invalid_context',
      `Agent 입력 데이터가 올바르지 않습니다. ${formatZodIssues(result.error)}`,
      result.error,
    )
  }

  return result.data
}
