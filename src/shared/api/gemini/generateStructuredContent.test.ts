import type { Schema } from 'firebase/ai'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { geminiModel } from '@/shared/api/gemini/client'

import { generateStructuredContent } from './generateStructuredContent'

vi.mock('@/shared/config/firebase', () => ({
  firebaseApp: {},
}))

vi.mock('@/shared/api/gemini/client', () => ({
  geminiAI: {},
  geminiModel: {
    generateContent: vi.fn(),
  },
}))

const schema = z.object({
  status: z.string().min(1),
})

const responseSchema = { type: 'object' } as Schema

describe('generateStructuredContent', () => {
  const generateContent = vi.mocked(geminiModel.generateContent)

  beforeEach(() => {
    generateContent.mockReset()
  })

  it('시스템 지침과 사용자 입력을 나누고 구조화 응답을 검증한다', async () => {
    generateContent.mockResolvedValue({
      response: { text: () => '{"status":"ok"}' },
    } as never)

    const signal = new AbortController().signal
    const result = await generateStructuredContent({
      systemInstruction: '시스템',
      prompt: '사용자',
      responseSchema,
      zodSchema: schema,
      signal,
      maxOutputTokens: 128,
    })

    expect(result).toEqual({ status: 'ok' })
    expect(generateContent).toHaveBeenCalledTimes(1)
    expect(generateContent.mock.calls[0]?.[0]).toMatchObject({
      systemInstruction: '시스템',
      contents: [{ role: 'user', parts: [{ type: 'text', text: '사용자' }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema,
        maxOutputTokens: 128,
      },
    })
    expect(generateContent.mock.calls[0]?.[1]).toEqual({ signal })
  })

  it('빈 응답, 잘못된 JSON, 스키마 불일치를 구분한다', async () => {
    generateContent.mockResolvedValueOnce({ response: { text: () => '   ' } } as never)
    await expect(request()).rejects.toMatchObject({ code: 'empty_response' })

    generateContent.mockResolvedValueOnce({ response: { text: () => '{' } } as never)
    await expect(request()).rejects.toMatchObject({ code: 'invalid_json' })

    generateContent.mockResolvedValueOnce({ response: { text: () => '{}' } } as never)
    await expect(request()).rejects.toMatchObject({ code: 'schema_mismatch' })

    expect(generateContent).toHaveBeenCalledTimes(3)
  })

  it('실패한 요청을 다시 호출하지 않는다', async () => {
    generateContent.mockRejectedValue(new Error('network'))

    await expect(request()).rejects.toMatchObject({
      name: 'StructuredContentError',
      code: 'request_failed',
    })
    expect(generateContent).toHaveBeenCalledTimes(1)
  })

  it('이미 중단된 요청은 API를 호출하지 않는다', async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(request(controller.signal)).rejects.toMatchObject({ code: 'aborted' })
    expect(generateContent).not.toHaveBeenCalled()
  })
})

function request(signal?: AbortSignal) {
  return generateStructuredContent({
    systemInstruction: '시스템',
    prompt: '사용자',
    responseSchema,
    zodSchema: schema,
    signal,
  })
}
