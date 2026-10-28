import { ThemeProvider } from '@emotion/react'

import { GlobalStyles, theme } from '@/shared/styles'
import { GeminiTest } from '@/pages/home/ui/GeminiTest'

export const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      {/* <h1>tana</h1> */}
      <GeminiTest />
    </ThemeProvider>
  )
}
