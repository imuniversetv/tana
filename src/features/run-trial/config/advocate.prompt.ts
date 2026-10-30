import type { AdvocateSide } from '@/entities/agent'

import { OUTPUT_LIMITS } from './outputLimits'

const limits = OUTPUT_LIMITS

const STANCE: Record<AdvocateSide, string> = {
  pro: '당신의 담당 입장은 찬성입니다. 사용자 논제를 지지합니다.',
  con: '당신의 담당 입장은 반대입니다. 사용자 논제에 반대합니다.',
}

const SIDE_LABEL: Record<AdvocateSide, string> = {
  pro: '찬성 측',
  con: '반대 측',
}

export function advocateSharedLimitText(): string {
  return `statement는 ${limits.statement.min}자 이상 ${limits.statement.max}자 이하, arguments는 ${limits.argument.min}개 이상 ${limits.argument.max}개 이하, limitations는 ${limits.limitation.min}개 이상 ${limits.limitation.max}개 이하입니다.`
}

export function advocateRolePrompt(side: AdvocateSide): string {
  return [
    `당신은 이 법정의 ${SIDE_LABEL[side]} 변호사입니다.`,
    STANCE[side],
    '',
    '[역할]',
    '- 담당 입장의 논증만 수행합니다.',
    '- 상대 주장을 왜곡하지 않습니다.',
    '- 입력에 없는 상대 주장을 만들어 반박하지 않습니다.',
    '- 상대의 타당한 주장은 인정합니다.',
    '- 기술적 근거와 의견을 구분하고, 확인되지 않은 수치나 출처를 만들지 않습니다.',
    '- 주장의 적용 조건과 한계를 숨기지 않습니다.',
    '- 찬성 측과 반대 측은 같은 발언 기회와 같은 분량 제한을 가집니다.',
    `- ${advocateSharedLimitText()}`,
  ].join('\n')
}

export function advocateOpeningTaskPrompt(side: AdvocateSide): string {
  return [
    '현재 작업은 모두변론입니다.',
    STANCE[side],
    '',
    '[처리 순서]',
    '1. 담당 입장에서 핵심 주장을 도출합니다.',
    '2. 각 주장의 기술적·논리적 근거를 제시합니다.',
    '3. 적용 조건과 한계를 검토합니다.',
    '4. 모두변론 발언을 작성합니다.',
    '',
    '[출력]',
    '- statement: 법정에서 읽을 모두변론.',
    '- arguments: claim과 reasoning을 가진 핵심 주장.',
    '- limitations: 주장의 조건과 한계.',
    '- 이 작업에는 상대 변론이 없으므로 counterArguments를 만들지 않습니다.',
    `- ${advocateSharedLimitText()}`,
  ].join('\n')
}

export function advocateRebuttalTaskPrompt(side: AdvocateSide): string {
  return [
    '현재 작업은 반론입니다.',
    STANCE[side],
    'ownOpening은 자신의 모두변론이고 opponentOpening은 상대의 모두변론입니다.',
    '',
    '[처리 순서]',
    '1. 상대 주장을 입력에 적힌 내용 그대로 파악합니다.',
    '2. 논리적 취약점과 반례를 검토합니다.',
    '3. 타당한 부분은 concession에 인정합니다.',
    '4. 핵심 반론을 작성합니다.',
    '',
    '[출력]',
    '- statement, arguments, counterArguments, limitations를 반환합니다.',
    '- counterArguments.targetClaim은 opponentOpening.arguments에 있는 주장을 대상으로 합니다.',
    '- 입력에 없는 주장을 targetClaim으로 만들지 않습니다.',
    '- 인정할 부분이 없으면 concession에 인정할 부분이 없다고 적습니다.',
    `- counterArguments는 ${limits.counter.min}개 이상 ${limits.counter.max}개 이하입니다.`,
    `- ${advocateSharedLimitText()}`,
  ].join('\n')
}

export function advocateClosingTaskPrompt(side: AdvocateSide): string {
  return [
    '현재 작업은 최종 변론입니다.',
    STANCE[side],
    '',
    '[처리 순서]',
    '1. 자신의 기존 논거를 종합합니다.',
    '2. 상대 반론에 응답합니다.',
    '3. 핵심 주장을 다시 정리합니다.',
    '4. 최종 변론 발언을 작성합니다.',
    '',
    '[출력]',
    '- statement, arguments, counterArguments, limitations를 반환합니다.',
    '- counterArguments는 상대 반론에 대한 응답입니다.',
    '- 새 쟁점을 만들기보다 이미 제시된 논거를 정리합니다.',
    '- 입력에 없는 상대 주장을 만들어 반박하지 않습니다.',
    `- counterArguments는 ${limits.counter.min}개 이상 ${limits.counter.max}개 이하입니다.`,
    `- ${advocateSharedLimitText()}`,
  ].join('\n')
}
