import { getGenerativeModel, Schema } from 'firebase/ai'

import { geminiAI } from '@/shared/api/gemini/client'

import { caseAnalysisPrompt } from '../config/caseAnalysis.prompt'
import { caseAnalysisSchema } from '../model/caseAnalysis.schema'
import type { CaseAnalysis } from '@/entities/case/model/case.types'

const responseSchema = Schema.object({
  properties: {
    status: Schema.enumString({
      enum: ['accepted', 'out_of_scope', 'not_debatable', 'needs_clarification'],
    }),
    category: Schema.enumString({
      enum: ['ui', 'ux', 'publishing', 'frontend', 'design-system', 'other'],
    }),
    topic: Schema.string(),
    proposition: Schema.string(),
    reason: Schema.string(),
  },
})

const model = getGenerativeModel(geminiAI, {
  model: 'gemini-3.5-flash-lite',
  systemInstruction: caseAnalysisPrompt,
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema,
  },
})

export async function analyzeCase(input: string): Promise<CaseAnalysis> {
  const normalizedInput = input.trim()

  if (!normalizedInput) {
    throw new Error('논제를 입력해주세요.')
  }

  const result = await model.generateContent(normalizedInput)
  const text = result.response.text()

  if (!text) {
    throw new Error('Gemini 응답이 비어 있습니다.')
  }

  return caseAnalysisSchema.parse(JSON.parse(text))
}
