import type { Schema } from 'firebase/ai'
import type { z } from 'zod'

import { geminiModel } from './client'
import { StructuredContentError } from './errors'

export interface GenerateStructuredContentParams<T> {
  systemInstruction: string
  prompt: string
  responseSchema: Schema
  zodSchema: z.ZodType<T>
  signal?: AbortSignal
  maxOutputTokens?: number
}

export async function generateStructuredContent<T>(
  params: GenerateStructuredContentParams<T>,
): Promise<T> {
  if (params.signal?.aborted) {
    throw new StructuredContentError('aborted', '요청이 중단되었습니다.')
  }

  const systemInstruction = params.systemInstruction.trim()
  const prompt = params.prompt.trim()

  if (!systemInstruction || !prompt) {
    throw new StructuredContentError('request_failed', '프롬프트를 입력해주세요.')
  }

  let result: Awaited<ReturnType<typeof geminiModel.generateContent>>

  try {
    result = await geminiModel.generateContent(
      {
        contents: [{ role: 'user', parts: [{ type: 'text', text: prompt }] }],
        systemInstruction,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: params.responseSchema,
          maxOutputTokens: params.maxOutputTokens,
        },
      },
      { signal: params.signal },
    )
  } catch (error) {
    if (params.signal?.aborted || isAbortError(error)) {
      throw new StructuredContentError('aborted', '요청이 중단되었습니다.', error)
    }

    throw new StructuredContentError('request_failed', 'Gemini API 호출에 실패했습니다.', error)
  }

  const text = result.response.text()?.trim() ?? ''

  if (!text) {
    throw new StructuredContentError('empty_response', 'Gemini 응답이 비어 있습니다.')
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch (error) {
    throw new StructuredContentError('invalid_json', 'Gemini 응답이 올바른 JSON이 아닙니다.', error)
  }

  const validated = params.zodSchema.safeParse(parsed)

  if (!validated.success) {
    throw new StructuredContentError(
      'schema_mismatch',
      'Gemini 응답이 스키마와 일치하지 않습니다.',
      validated.error,
    )
  }

  return validated.data
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}
