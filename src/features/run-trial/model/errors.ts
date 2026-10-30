import type { z } from 'zod'

import type { StructuredContentCode } from '@/shared/api/gemini/errors'

export type AgentExecutionCode = StructuredContentCode | 'unsupported_task' | 'invalid_context'

export class AgentExecutionError extends Error {
  readonly code: AgentExecutionCode

  constructor(code: AgentExecutionCode, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'AgentExecutionError'
    this.code = code
  }
}

export function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 3)
    .map((issue) => {
      const path = issue.path.map(String).join('.')
      return path ? `${path}: ${issue.message}` : issue.message
    })
    .join(' ')
}
