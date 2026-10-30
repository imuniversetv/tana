import { describe, expect, it } from 'vitest'

import { AgentExecutionError } from '../model/errors'
import { classifyTrialError, isRetryableTrialError, retryDelayMs } from './classifyTrialError'

describe('classifyTrialError', () => {
  it('네트워크와 요청 제한만 재시도 대상으로 구분한다', () => {
    expect(classifyTrialError(new AgentExecutionError('request_failed', '네트워크')).kind).toBe(
      'network',
    )
    expect(
      classifyTrialError(
        new AgentExecutionError('request_failed', 'quota', { status: 429, retryAfterMs: 2500 }),
      ),
    ).toEqual({ kind: 'rate_limit', message: 'quota', retryAfterMs: 2500 })
    expect(classifyTrialError(new AgentExecutionError('schema_mismatch', '불일치')).kind).toBe(
      'schema_mismatch',
    )
    expect(classifyTrialError(new AgentExecutionError('invalid_json', 'json')).kind).toBe(
      'invalid_json',
    )
    expect(classifyTrialError(new AgentExecutionError('empty_response', '빈 응답')).kind).toBe(
      'empty_response',
    )
    expect(classifyTrialError(new AgentExecutionError('aborted', '중단')).kind).toBe('cancelled')
    expect(isRetryableTrialError('network')).toBe(true)
    expect(isRetryableTrialError('rate_limit')).toBe(true)
    expect(isRetryableTrialError('schema_mismatch')).toBe(false)
  })

  it('재시도 대기 시간은 지수로 늘리고 서버 대기 시간을 존중한다', () => {
    expect(retryDelayMs(0, 1000, 8000)).toBe(1000)
    expect(retryDelayMs(3, 1000, 8000)).toBe(8000)
    expect(retryDelayMs(0, 1000, 8000, 5000)).toBe(5000)
  })
})
