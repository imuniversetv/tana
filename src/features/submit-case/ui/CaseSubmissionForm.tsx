import { useState } from 'react'
import styled from '@emotion/styled'

import { analyzeCase } from '../api/analyzeCase'

import type { CaseAnalysis } from '@/entities/case'

interface CaseSubmissionFormProps {
  onAnalyzed?: (originalText: string, analysis: CaseAnalysis) => void
}

export function CaseSubmissionForm({ onAnalyzed }: CaseSubmissionFormProps) {
  const [input, setInput] = useState('')
  const [analysis, setAnalysis] = useState<CaseAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!input.trim() || loading) return

    setLoading(true)
    setError(null)
    setAnalysis(null)

    try {
      const result = await analyzeCase(input)
      setAnalysis(result)
      onAnalyzed?.(input, result)
    } catch (error) {
      console.error(error)
      setError('논제 분석에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Section>
      <h2>논제 분석</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="UI/UX 또는 웹 퍼블리싱 관련 의견을 입력해주세요."
          maxLength={1000}
          rows={6}
        />

        <button type="submit" disabled={loading || !input.trim()}>
          {loading ? '분석 중...' : '논제 분석하기'}
        </button>
      </form>

      {error && <p role="alert">{error}</p>}

      {analysis && (
        <section aria-live="polite">
          <h2>분석 결과</h2>

          <p>상태: {analysis.status}</p>
          <p>분야: {analysis.category}</p>
          <p>주제: {analysis.topic}</p>
          <p>판단 근거: {analysis.reason}</p>

          {analysis.proposition && <p>논제: {analysis.proposition}</p>}

          {analysis.status === 'accepted' && <p>재판 진행이 가능한 논제입니다.</p>}
        </section>
      )}
    </Section>
  )
}

const Section = styled.section`
  display: grid;
  gap: 12px;

  h2,
  p {
    margin: 0;
  }

  form {
    display: grid;
    gap: 12px;
  }

  textarea {
    width: 100%;
    padding: 12px;
    font: inherit;
    resize: vertical;
  }

  button {
    justify-self: start;
    padding: 8px 14px;
    font: inherit;
  }
`
