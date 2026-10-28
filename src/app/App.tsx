import { ThemeProvider } from '@emotion/react'

import { GlobalStyles, theme } from '@/shared/styles'
import { HomePage } from '@/pages/home/ui/HomePage'

export const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <HomePage />
    </ThemeProvider>
  )
}
