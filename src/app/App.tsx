import { useState } from 'react'
import { ThemeProvider } from '@emotion/react'

import type { CaseAnalysis } from '@/entities/case'
import { TrialPage } from '@/pages/agentSpeech'
import { CaseAnalysisPage, CaseAnalysisResultPage } from '@/pages/caseAnalysis'
import { GlobalStyles, theme } from '@/shared/styles'

import { AppLayout } from './ui/AppLayout'

type Screen =
  | { kind: 'input'; draft: string }
  | { kind: 'rejected'; draft: string; analysis: CaseAnalysis }
  | { kind: 'trial'; originalText: string; analysis: CaseAnalysis }

export const App = () => {
  const [screen, setScreen] = useState<Screen>({ kind: 'input', draft: '' })

  const handleAnalyzed = (originalText: string, analysis: CaseAnalysis) => {
    if (analysis.status === 'accepted' && analysis.category !== 'other') {
      setScreen({ kind: 'trial', originalText, analysis })
      return
    }

    setScreen({ kind: 'rejected', draft: originalText, analysis })
  }

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <AppLayout>
        {screen.kind === 'input' && (
          <CaseAnalysisPage initialInput={screen.draft} onAnalyzed={handleAnalyzed} />
        )}
        {screen.kind === 'rejected' && (
          <CaseAnalysisResultPage
            analysis={screen.analysis}
            onBack={() => setScreen({ kind: 'input', draft: screen.draft })}
          />
        )}
        {screen.kind === 'trial' && (
          <TrialPage originalText={screen.originalText} analysis={screen.analysis} />
        )}
      </AppLayout>
    </ThemeProvider>
  )
}
