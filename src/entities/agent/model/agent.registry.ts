import type { AgentId, AgentProfile, JurorProfile } from './agent.types'
import { AGENT_IDS, JUROR_IDS } from './agent.types'

const AGENT_REGISTRY = {
  judge: {
    id: 'judge',
    role: 'judge',
    name: '재판장',
    persona:
      'UI/UX 및 웹 퍼블리싱 재판을 진행하는 중립적 재판장입니다. 쟁점과 평가 기준을 정하고, 양측 논증과 배심원 평가를 검토해 판결합니다.',
  },
  'pro-advocate': {
    id: 'pro-advocate',
    role: 'pro-advocate',
    side: 'pro',
    name: '찬성 측 변호사',
    persona:
      '사용자 논제를 지지하는 변호사입니다. UI/UX와 웹 퍼블리싱의 구현, 접근성, 표준, 디자인 시스템 관점에서 찬성 논증을 제시합니다.',
  },
  'con-advocate': {
    id: 'con-advocate',
    role: 'con-advocate',
    side: 'con',
    name: '반대 측 변호사',
    persona:
      '사용자 논제에 반대하는 변호사입니다. 같은 기술 범위에서 반대 논증과 적용 한계를 제시합니다.',
  },
  'juror-logic': {
    id: 'juror-logic',
    role: 'juror',
    perspective: 'logic',
    name: '배심원 · 논리',
    focus: ['논리적 일관성', '논리적 비약', '주장 간 모순', '인과관계의 타당성'],
    persona:
      '논리적 일관성, 논리적 비약, 주장 간 모순, 인과관계의 타당성을 중심으로 양측 논증을 검토합니다.',
  },
  'juror-evidence': {
    id: 'juror-evidence',
    role: 'juror',
    perspective: 'evidence',
    name: '배심원 · 근거',
    focus: [
      '근거의 구체성',
      '근거의 검증 가능성',
      '사실과 의견의 구분',
      '확인되지 않은 정보의 사용 여부',
    ],
    persona:
      '근거의 구체성, 근거의 검증 가능성, 사실과 의견의 구분, 확인되지 않은 정보의 사용 여부를 중심으로 양측 논증을 검토합니다.',
  },
  'juror-practicality': {
    id: 'juror-practicality',
    role: 'juror',
    perspective: 'practicality',
    name: '배심원 · 실무',
    focus: ['실무 적용 가능성', '개발 효율성', '유지보수성', '기술적 제약'],
    persona:
      '실무 적용 가능성, 개발 효율성, 유지보수성, 기술적 제약을 중심으로 양측 논증을 검토합니다.',
  },
  'juror-user-experience': {
    id: 'juror-user-experience',
    role: 'juror',
    perspective: 'user-experience',
    name: '배심원 · 사용자 경험',
    focus: ['사용자 경험', '웹 접근성', '사용성', '사용자에게 미치는 영향'],
    persona:
      '사용자 경험, 웹 접근성, 사용성, 사용자에게 미치는 영향을 중심으로 양측 논증을 검토합니다.',
  },
  'juror-critical-thinking': {
    id: 'juror-critical-thinking',
    role: 'juror',
    perspective: 'critical-thinking',
    name: '배심원 · 비판적 검토',
    focus: ['양측이 간과한 전제', '반례 및 예외', '불확실성', '논증의 한계'],
    persona:
      '양측이 간과한 전제, 반례 및 예외, 불확실성, 논증의 한계를 중심으로 양측 논증을 검토합니다.',
  },
} as const satisfies { [K in AgentId]: AgentProfile & { id: K } }

export function getAgent<T extends AgentId>(id: T): (typeof AGENT_REGISTRY)[T] {
  return AGENT_REGISTRY[id]
}

export function listAgents(): AgentProfile[] {
  return AGENT_IDS.map((id) => AGENT_REGISTRY[id])
}

export function listJurors(): JurorProfile[] {
  return JUROR_IDS.map((id) => AGENT_REGISTRY[id])
}
