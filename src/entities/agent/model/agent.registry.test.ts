import { describe, expect, it } from 'vitest'

import { getAgent, listAgents, listJurors } from '@/entities/agent'

describe('agent registry', () => {
  it('8개 Agent의 역할과 표시 정보를 조회한다', () => {
    const agents = listAgents()

    expect(agents).toHaveLength(8)
    expect(new Set(agents.map((agent) => agent.id)).size).toBe(8)
    expect(agents.filter((agent) => agent.role === 'judge')).toHaveLength(1)
    expect(
      agents.filter((agent) => agent.role === 'pro-advocate' || agent.role === 'con-advocate'),
    ).toHaveLength(2)
    expect(agents.filter((agent) => agent.role === 'juror')).toHaveLength(5)
    expect(agents.every((agent) => agent.name.length > 0 && agent.persona.length > 0)).toBe(true)
  })

  it('배심원 5명은 서로 다른 평가 관점을 가진다', () => {
    expect(listJurors().map((juror) => juror.perspective)).toEqual([
      'logic',
      'evidence',
      'practicality',
      'user-experience',
      'critical-thinking',
    ])
    expect(getAgent('juror-logic').focus).toEqual([
      '논리적 일관성',
      '논리적 비약',
      '주장 간 모순',
      '인과관계의 타당성',
    ])
    expect(getAgent('juror-evidence').focus).toContain('근거의 검증 가능성')
    expect(getAgent('juror-practicality').focus).toContain('유지보수성')
    expect(getAgent('juror-user-experience').focus).toContain('웹 접근성')
    expect(getAgent('juror-critical-thinking').focus).toContain('양측이 간과한 전제')
  })

  it('변호사의 담당 입장을 구분한다', () => {
    expect(getAgent('pro-advocate').side).toBe('pro')
    expect(getAgent('con-advocate').side).toBe('con')
    expect(getAgent('judge').role).toBe('judge')
  })
})
