export const AGENT_IDS = [
  'judge',
  'pro-advocate',
  'con-advocate',
  'juror-logic',
  'juror-evidence',
  'juror-practicality',
  'juror-user-experience',
  'juror-critical-thinking',
] as const

export type AgentId = (typeof AGENT_IDS)[number]

export const ADVOCATE_IDS = ['pro-advocate', 'con-advocate'] as const

export type AdvocateId = (typeof ADVOCATE_IDS)[number]

export const JUROR_IDS = [
  'juror-logic',
  'juror-evidence',
  'juror-practicality',
  'juror-user-experience',
  'juror-critical-thinking',
] as const

export type JurorId = (typeof JUROR_IDS)[number]

export type AgentRole = 'judge' | 'pro-advocate' | 'con-advocate' | 'juror'

export type JurorPerspective =
  'logic' | 'evidence' | 'practicality' | 'user-experience' | 'critical-thinking'

export type AdvocateSide = 'pro' | 'con'

interface AgentProfileBase {
  id: AgentId
  role: AgentRole
  name: string
  persona: string
}

export interface JudgeProfile extends AgentProfileBase {
  id: 'judge'
  role: 'judge'
}

export interface AdvocateProfile extends AgentProfileBase {
  id: AdvocateId
  role: AdvocateId
  side: AdvocateSide
}

export interface JurorProfile extends AgentProfileBase {
  id: JurorId
  role: 'juror'
  perspective: JurorPerspective
  focus: readonly string[]
}

export type AgentProfile = JudgeProfile | AdvocateProfile | JurorProfile
