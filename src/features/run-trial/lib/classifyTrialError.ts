import { AgentExecutionError } from '../model/errors'
import type { TrialErrorKind } from '../model/trial.session'

export interface ClassifiedTrialError {
  kind: TrialErrorKind
  message: string
  retryAfterMs?: number
}

const RETRYABLE_KINDS = new Set<TrialErrorKind>(['network', 'rate_limit'])

export function isRetryableTrialError(kind: TrialErrorKind): boolean {
  return RETRYABLE_KINDS.has(kind)
}

export function retryDelayMs(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  retryAfterMs?: number,
): number {
  const backoff = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs)
  return Math.max(backoff, retryAfterMs ?? 0)
}

export function classifyTrialError(error: unknown): ClassifiedTrialError {
  if (isOrchestratorError(error)) {
    return { kind: error.kind, message: error.message }
  }

  if (error instanceof AgentExecutionError) {
    if (error.code === 'aborted') {
      return { kind: 'cancelled', message: error.message }
    }

    if (
      error.code === 'empty_response' ||
      error.code === 'invalid_json' ||
      error.code === 'schema_mismatch'
    ) {
      return { kind: error.code, message: error.message }
    }

    if (error.code === 'invalid_context') {
      return { kind: 'schema_mismatch', message: error.message }
    }

    if (error.code === 'request_failed') {
      return classifyRequestFailure(error)
    }
  }

  if (isAbortError(error)) {
    return { kind: 'cancelled', message: '재판이 취소되었습니다.' }
  }

  if (readStatus(error) === 429 || mentionsRateLimit(error)) {
    return {
      kind: 'rate_limit',
      message: error instanceof Error ? error.message : 'API 요청 제한에 도달했습니다.',
      retryAfterMs: readRetryAfterMs(error),
    }
  }

  return {
    kind: 'unexpected',
    message: error instanceof Error ? error.message : '재판 진행 중 오류가 발생했습니다.',
  }
}

function classifyRequestFailure(error: AgentExecutionError): ClassifiedTrialError {
  if (readStatus(error) === 429 || mentionsRateLimit(error)) {
    return {
      kind: 'rate_limit',
      message: error.message,
      retryAfterMs: readRetryAfterMs(error),
    }
  }

  return {
    kind: 'network',
    message: error.message,
    retryAfterMs: readRetryAfterMs(error),
  }
}

function isOrchestratorError(error: unknown): error is { kind: TrialErrorKind; message: string } {
  if (!(error instanceof Error) || error.name !== 'TrialOrchestratorError' || !('kind' in error)) {
    return false
  }

  return (
    error.kind === 'network' ||
    error.kind === 'rate_limit' ||
    error.kind === 'empty_response' ||
    error.kind === 'invalid_json' ||
    error.kind === 'schema_mismatch' ||
    error.kind === 'unexpected' ||
    error.kind === 'cancelled' ||
    error.kind === 'invalid_input' ||
    error.kind === 'duplicate'
  )
}

function mentionsRateLimit(error: unknown): boolean {
  const text = chain(error)
    .map((item) => (item instanceof Error ? item.message : ''))
    .join(' ')
    .toLowerCase()

  return (
    text.includes('429') ||
    text.includes('quota') ||
    text.includes('rate limit') ||
    text.includes('resource exhausted')
  )
}

function readStatus(error: unknown): number | undefined {
  for (const item of chain(error)) {
    if (!isRecord(item)) continue

    if (typeof item.status === 'number') return item.status

    if (isRecord(item.customErrorData) && typeof item.customErrorData.status === 'number') {
      return item.customErrorData.status
    }
  }

  return undefined
}

function readRetryAfterMs(error: unknown): number | undefined {
  for (const item of chain(error)) {
    if (!isRecord(item)) continue

    if (typeof item.retryAfterMs === 'number') return item.retryAfterMs

    const data = item.customErrorData
    if (!isRecord(data)) continue

    if (typeof data.retryAfterMs === 'number') return data.retryAfterMs

    if (isRecord(data.retryDelay) && typeof data.retryDelay.seconds === 'number') {
      return data.retryDelay.seconds * 1000
    }
  }

  return undefined
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

function chain(error: unknown): unknown[] {
  const items: unknown[] = []
  const seen = new Set<unknown>()
  let current = error

  while (current && !seen.has(current)) {
    seen.add(current)
    items.push(current)
    current = isRecord(current) ? current.cause : undefined
  }

  return items
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
