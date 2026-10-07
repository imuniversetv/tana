import { ThemeProvider } from '@emotion/react'

import { GlobalStyles, theme } from '@/shared/styles'

export const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <h1>tana</h1>
    </ThemeProvider>
  )
}
