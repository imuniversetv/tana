import { geminiModel } from './client'

export async function generateText(prompt: string): Promise<string> {
  if (!prompt.trim()) {
    throw new Error('프롬프트를 입력해주세요.')
  }

  const result = await geminiModel.generateContent(prompt)

  return result.response.text()
}
