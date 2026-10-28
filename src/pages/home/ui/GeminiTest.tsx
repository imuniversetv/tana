import { useState } from 'react'

import { generateText } from '@/shared/api/gemini/generateText'

export function GeminiTest() {
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    setResponse('')

    try {
      const result = await generateText(prompt)
      setResponse(result)
    } catch (error) {
      console.error(error)
      setResponse('Gemini API 호출에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="Gemini에게 질문해보세요."
      />

      <button type="button" onClick={handleGenerate} disabled={loading || !prompt.trim()}>
        {loading ? '응답 생성 중...' : '질문하기'}
      </button>

      <p>{response}</p>
    </div>
  )
}
