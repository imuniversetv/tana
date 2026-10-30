import { ThemeProvider } from '@emotion/react'

import { HomePage } from '@/pages/home/ui/HomePage'
import { GlobalStyles, theme } from '@/shared/styles'

import { AppLayout } from './ui/AppLayout'

export const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <AppLayout>
        <HomePage />
      </AppLayout>
    </ThemeProvider>
  )
}
