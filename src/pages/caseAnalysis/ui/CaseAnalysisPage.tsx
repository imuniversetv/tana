import { useState, type FormEvent } from 'react'
import styled from '@emotion/styled'

import caseAnalysisBackground from '@/assets/images/case-analysis-background.png'
import type { CaseAnalysis } from '@/entities/case'
import { analyzeCase } from '@/features/submit-case'
import { Button } from '@/shared/ui'

interface CaseAnalysisPageProps {
  initialInput?: string
  onAnalyzed: (originalText: string, analysis: CaseAnalysis) => void
}

export function CaseAnalysisPage({ initialInput = '', onAnalyzed }: CaseAnalysisPageProps) {
  const [input, setInput] = useState(initialInput)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const originalText = input.trim()
    if (!originalText || loading) return

    setLoading(true)
    setError(null)

    try {
      onAnalyzed(originalText, await analyzeCase(originalText))
    } catch (caught) {
      console.error(caught)
      setError('논제 분석에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen>
      <Background src={caseAnalysisBackground} alt="" />
      <Center>
        <Form onSubmit={handleSubmit}>
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="UI/UX 또는 웹 퍼블리싱 관련 논제를 입력해주세요."
            maxLength={1000}
            aria-label="논제"
            disabled={loading}
          />
          <Button
            type="submit"
            variant="light"
            label={loading ? '분석 중...' : '논제 분석하기'}
            disabled={loading}
          />
          {error && <ErrorText role="alert">{error}</ErrorText>}
        </Form>
      </Center>
    </Screen>
  )
}

const Screen = styled.section`
  position: relative;
  width: 100cqw;
  height: 100vh;
  margin-left: calc(50% - 50cqw);
`

const Background = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const Center = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: min(800px, calc(100% - 48px));

  & > button {
    margin: 16px auto 0;
  }
`

const Textarea = styled.textarea`
  width: 100%;
  height: 360px;
  padding: 0 20px;
  border: none;
  outline: none;
  background: transparent;
  color: #fff;
  font: inherit;
  font-size: 60px;
  resize: none;

  &::placeholder {
    color: #fff;
  }
`

const ErrorText = styled.p`
  margin: 16px 0 0;
  color: #fbf4e4;
  font-size: 18px;
  line-height: 1.5;
  text-align: center;
`
