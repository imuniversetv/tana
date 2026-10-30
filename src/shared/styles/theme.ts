export const theme = {
  layout: {
    width: 960,
  },
  font: {
    family: 'ChosunGs',
  },
  colors: {
    text: '#111111',
    background: '#ffffff',
  },
} as const

export type AppTheme = typeof theme
