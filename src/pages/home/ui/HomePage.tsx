import { useState } from 'react'
import styled from '@emotion/styled'

import type { CaseAnalysis } from '@/entities/case'
import { AgentPlayground } from '@/features/run-trial'
import { CaseSubmissionForm } from '@/features/submit-case'

export function HomePage() {
  const [source, setSource] = useState<{ originalText: string; analysis: CaseAnalysis } | null>(
    null,
  )

  return (
    <Page>
      <h1>AI 법정</h1>
      <CaseSubmissionForm
        onAnalyzed={(originalText, analysis) => setSource({ originalText, analysis })}
      />
      <AgentPlayground source={source} />
    </Page>
  )
}

const Page = styled.main`
  padding: 40px 0 80px;
  display: grid;
  gap: 40px;

  h1 {
    margin: 0;
    font-size: 32px;
  }
`
