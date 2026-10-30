import type { ButtonHTMLAttributes } from 'react'
import styled from '@emotion/styled'

export type ButtonVariant = 'light' | 'dark'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  label: string
}

export function Button({ variant = 'light', type = 'button', label, ...props }: ButtonProps) {
  return (
    <StyledButton type={type} variant={variant} {...props}>
      {label}
    </StyledButton>
  )
}

const StyledButton = styled('button', {
  shouldForwardProp: (prop) => prop !== 'variant',
})<{ variant: ButtonVariant }>`
  width: 340px;
  height: 60px;
  border: 2px solid ${({ variant }) => (variant === 'light' ? '#e5a229' : '#8b7764')};
  border-radius: 4px;
  background: ${({ variant }) => (variant === 'light' ? '#fbf4e4' : '#1a2236')};
  color: ${({ variant }) => (variant === 'light' ? '#111111' : '#d4c4a8')};
  font: inherit;
  font-size: 28px;
  line-height: 1;

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
`
