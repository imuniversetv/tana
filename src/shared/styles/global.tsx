import { css, Global } from '@emotion/react'

import chosunGsUrl from '@/assets/fonts/ChosunGs.TTF'

export const GlobalStyles = () => {
  return (
    <Global
      styles={(theme) => css`
        @font-face {
          font-family: '${theme.font.family}';
          src: url('${chosunGsUrl}') format('truetype');
          font-weight: 400;
          font-style: normal;
          font-display: swap;
        }

        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }

        * {
          margin: 0;
        }

        html {
          min-width: ${theme.layout.width}px;
          line-height: 1.5;
          -webkit-text-size-adjust: none;
          text-size-adjust: none;
          tab-size: 4;
          -webkit-font-smoothing: antialiased;
        }

        html,
        body,
        #root {
          min-height: 100%;
        }

        #root {
          container-type: inline-size;
        }

        body {
          min-width: ${theme.layout.width}px;
          font-family: '${theme.font.family}', sans-serif;
          color: ${theme.colors.text};
          background: ${theme.colors.background};
          line-height: inherit;
        }

        h1,
        h2,
        h3,
        h4 {
          text-wrap: balance;
          line-height: 1.1;
        }

        p,
        h1,
        h2,
        h3,
        h4,
        h5,
        h6,
        li {
          overflow-wrap: break-word;
        }

        img,
        picture,
        video,
        canvas,
        svg {
          display: block;
          max-width: 100%;
        }

        ul,
        ol {
          padding: 0;
          list-style: none;
        }

        a {
          color: inherit;
          text-decoration-skip-ink: auto;
        }

        table {
          border-collapse: collapse;
          border-spacing: 0;
        }

        input,
        button,
        textarea,
        select {
          font: inherit;
          color: inherit;
          letter-spacing: inherit;
        }

        button,
        [type='button'],
        [type='reset'],
        [type='submit'] {
          cursor: pointer;
        }

        button:disabled,
        input:disabled,
        textarea:disabled,
        select:disabled {
          cursor: default;
        }

        textarea {
          resize: vertical;
        }

        fieldset {
          min-width: 0;
          border: 0;
          padding: 0;
        }

        ::placeholder {
          opacity: 1;
          color: #8a8a8a;
        }

        [hidden] {
          display: none !important;
        }

        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }

          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}
    />
  )
}
