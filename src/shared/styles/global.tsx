import { css, Global } from '@emotion/react'

export const GlobalStyles = () => {
  return (
    <Global
      styles={(theme) => css`
        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }

        html,
        body,
        #root {
          margin: 0;
          height: 100%;
        }

        body {
          font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
          color: ${theme.colors.text};
          background: ${theme.colors.background};
        }
      `}
    />
  )
}
