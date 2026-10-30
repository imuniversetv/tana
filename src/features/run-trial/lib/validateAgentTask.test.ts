import { describe, expect, it } from 'vitest'

import { AGENT_TASKS, isSupportedTask, SUPPORTED_TASKS } from './validateAgentTask'

describe('agent tasks', () => {
  it('역할마다 지원하는 작업이 정해져 있다', () => {
    expect(SUPPORTED_TASKS.judge).toEqual(['opening', 'judgment'])
    expect(SUPPORTED_TASKS['pro-advocate']).toEqual(['opening', 'rebuttal', 'closing'])
    expect(SUPPORTED_TASKS['con-advocate']).toEqual(['opening', 'rebuttal', 'closing'])
    expect(SUPPORTED_TASKS.juror).toEqual(['evaluation'])
  })

  it('지원하지 않는 역할과 작업 조합을 거부한다', () => {
    const roles = ['judge', 'pro-advocate', 'con-advocate', 'juror'] as const

    for (const role of roles) {
      for (const task of AGENT_TASKS) {
        const supported = (SUPPORTED_TASKS[role] as readonly string[]).includes(task)
        expect(isSupportedTask(role, task)).toBe(supported)
      }
    }

    expect(isSupportedTask('judge', 'rebuttal')).toBe(false)
    expect(isSupportedTask('juror', 'opening')).toBe(false)
    expect(isSupportedTask('pro-advocate', 'judgment')).toBe(false)
    expect(isSupportedTask('con-advocate', 'evaluation')).toBe(false)
  })
})
