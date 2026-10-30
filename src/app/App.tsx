import { ThemeProvider } from '@emotion/react'

import { AgentSpeechPage } from '@/pages/home/ui/AgentSpeechPage'
import { GlobalStyles, theme } from '@/shared/styles'

import { AppLayout } from './ui/AppLayout'

export const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <AppLayout>
        <AgentSpeechPage
          role="judge"
          message="안녕하세요~~"
          onNext={() => {
            // 다음 대답으로 넘깁니다.
          }}
        />
      </AppLayout>
    </ThemeProvider>
  )
}
