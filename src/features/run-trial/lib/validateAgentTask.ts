import type { AgentRole } from '@/entities/agent'

export const AGENT_TASKS = ['opening', 'rebuttal', 'closing', 'evaluation', 'judgment'] as const

export type AgentTask = (typeof AGENT_TASKS)[number]

export const SUPPORTED_TASKS = {
  judge: ['opening', 'judgment'],
  'pro-advocate': ['opening', 'rebuttal', 'closing'],
  'con-advocate': ['opening', 'rebuttal', 'closing'],
  juror: ['evaluation'],
} as const satisfies Record<AgentRole, readonly AgentTask[]>

export function isSupportedTask(role: AgentRole, task: string): boolean {
  return (SUPPORTED_TASKS[role] as readonly string[]).includes(task)
}
