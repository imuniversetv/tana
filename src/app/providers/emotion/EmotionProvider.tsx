import { ThemeProvider } from '@emotion/react'
import type { ReactNode } from 'react'

import { GlobalStyles, theme } from '@/shared/styles'

type EmotionProviderProps = {
  children: ReactNode
}

export const EmotionProvider = ({ children }: EmotionProviderProps) => {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      {children}
    </ThemeProvider>
  )
}
