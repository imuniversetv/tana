import type { ReactNode } from 'react'
import styled from '@emotion/styled'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return <Main>{children}</Main>
}

const Main = styled.main`
  width: ${({ theme }) => theme.layout.width}px;
  margin: 0 auto;
`
