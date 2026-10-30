import { describe, expect, it } from 'vitest'

import { advocateArgumentResponse, advocateOpeningResponse } from '../model/fixtures'
import { toTrialStatement } from './toTrialStatement'

describe('toTrialStatement', () => {
  it('모두변론을 빈 반론 목록과 함께 재판 기록으로 바꾼다', () => {
    expect(toTrialStatement(advocateOpeningResponse(), 'pro')).toMatchObject({
      side: 'pro',
      counterArguments: [],
    })
  })

  it('반론과 최종 변론의 반박을 유지한다', () => {
    const statement = toTrialStatement(advocateArgumentResponse(), 'con')

    expect(statement.side).toBe('con')
    expect(statement.counterArguments).toHaveLength(1)
  })
})
