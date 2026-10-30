import type { AdvocateSide, JurorId } from '@/entities/agent'
import { JUROR_IDS } from '@/entities/agent'
import type { CaseAnalysis } from '@/entities/case'
import type {
  AdvocateArgumentResponse,
  AdvocateClosingContext,
  AdvocateOpeningContext,
  AdvocateOpeningResponse,
  AdvocateRebuttalContext,
  ArgumentPoint,
  EvaluationCriterion,
  JudgeJudgmentContext,
  JudgeJudgmentResponse,
  JudgeOpeningContext,
  JudgeOpeningResponse,
  JurorEvaluation,
  JurorEvaluationContext,
  JurorEvaluationResponse,
  JuryScore,
  JuryVote,
  TrialIssue,
  TrialStatement,
} from '@/entities/trial'

import { OUTPUT_LIMITS } from '../config/outputLimits'

export const PROPOSITION = '본문보다 낮은 버튼 명도 대비는 사용성을 해친다.'
export const TOPIC = '버튼 명도 대비'

export function koreanText(seed: string, minLength: number): string {
  const unit = ' 화면의 구조와 접근성, 구현 제약을 함께 봅니다.'
  let text = seed

  while (text.length < minLength) {
    text += unit
  }

  return text
}

export function acceptedAnalysis(): CaseAnalysis {
  return {
    status: 'accepted',
    category: 'ux',
    topic: TOPIC,
    proposition: PROPOSITION,
    reason: '웹 접근성과 UI 대비라는 찬반 논증이 가능합니다.',
  }
}

export function sampleIssues(): TrialIssue[] {
  return [
    {
      title: '명도 대비',
      description: '버튼과 본문의 대비가 화면에서 정보 우선순위에 미치는 영향을 다룹니다.',
    },
    {
      title: '구현 비용',
      description: '대비 기준을 컴포넌트에 적용할 때의 스타일 구현과 유지보수 범위를 다룹니다.',
    },
  ]
}

export function sampleCriteria(): EvaluationCriterion[] {
  return [
    { name: '접근성', description: '텍스트와 컨트롤의 대비가 사용에 충분한지 봅니다.' },
    { name: '일관성', description: '같은 대비 기준이 디자인 시스템 안에서 유지되는지 봅니다.' },
  ]
}

export function sampleArguments(seed: string): ArgumentPoint[] {
  return [
    {
      claim: `${seed} 핵심 주장`,
      reasoning: `${seed}의 구현 근거는 컴포넌트 상태와 명도 대비에 있습니다.`,
    },
    {
      claim: `${seed} 보조 주장`,
      reasoning: `${seed}의 접근성 근거는 키보드 초점과 화면 읽기 순서에 있습니다.`,
    },
  ]
}

export function sampleStatement(
  side: AdvocateSide,
  seed: string,
  withCounter: boolean,
): TrialStatement {
  return {
    side,
    statement: koreanText(`${seed} 발언입니다.`, OUTPUT_LIMITS.statement.min),
    arguments: sampleArguments(seed),
    counterArguments: withCounter
      ? [
          {
            targetClaim: '상대 핵심 주장',
            rebuttal: `${seed}은 상대 주장의 적용 범위를 화면 단위로 제한합니다.`,
            concession: '초기 구현 비용이 늘어날 수 있다는 지적은 타당합니다.',
          },
        ]
      : [],
    limitations: [`${seed}은 소규모 정적 페이지에서 비용 구조가 달라질 수 있습니다.`],
  }
}

export function judgeOpeningContext(): JudgeOpeningContext {
  const analysis = acceptedAnalysis()

  return {
    originalText: '버튼 대비가 본문보다 낮으면 사용성이 떨어집니다.',
    proposition: analysis.proposition,
    category: analysis.category,
    topic: analysis.topic,
    analysis,
  }
}

export function advocateOpeningContext(): AdvocateOpeningContext {
  return {
    proposition: PROPOSITION,
    issues: sampleIssues(),
  }
}

export function advocateRebuttalContext(side: AdvocateSide): AdvocateRebuttalContext {
  const opponent: AdvocateSide = side === 'pro' ? 'con' : 'pro'

  return {
    proposition: PROPOSITION,
    issues: sampleIssues(),
    ownOpening: sampleStatement(side, side === 'pro' ? '찬성 모두변론' : '반대 모두변론', false),
    opponentOpening: sampleStatement(
      opponent,
      opponent === 'pro' ? '찬성 모두변론' : '반대 모두변론',
      false,
    ),
  }
}

export function trialRecord() {
  return {
    proposition: PROPOSITION,
    issues: sampleIssues(),
    criteria: sampleCriteria(),
    proOpening: sampleStatement('pro', '찬성 모두변론', false),
    conOpening: sampleStatement('con', '반대 모두변론', false),
    proRebuttal: sampleStatement('pro', '찬성 반론', true),
    conRebuttal: sampleStatement('con', '반대 반론', true),
    proClosing: sampleStatement('pro', '찬성 최종변론', true),
    conClosing: sampleStatement('con', '반대 최종변론', true),
  }
}

export function advocateClosingContext(): AdvocateClosingContext {
  const record = trialRecord()

  return {
    proposition: record.proposition,
    proOpening: record.proOpening,
    conOpening: record.conOpening,
    proRebuttal: record.proRebuttal,
    conRebuttal: record.conRebuttal,
  }
}

export function jurorEvaluationContext(): JurorEvaluationContext {
  const record = trialRecord()

  return {
    proposition: record.proposition,
    issues: record.issues,
    proOpening: record.proOpening,
    conOpening: record.conOpening,
    proRebuttal: record.proRebuttal,
    conRebuttal: record.conRebuttal,
    proClosing: record.proClosing,
    conClosing: record.conClosing,
  }
}

export function juryScore(
  logicalValidity: number,
  evidenceReliability: number,
  rebuttalResponse: number,
  overallPersuasiveness: number,
  total?: number,
): JuryScore {
  return {
    logicalValidity,
    evidenceReliability,
    rebuttalResponse,
    overallPersuasiveness,
    total:
      total ?? logicalValidity + evidenceReliability + rebuttalResponse + overallPersuasiveness,
  }
}

const VOTES: Record<JurorId, JuryVote> = {
  'juror-logic': 'pro',
  'juror-evidence': 'pro',
  'juror-practicality': 'pro',
  'juror-user-experience': 'con',
  'juror-critical-thinking': 'abstain',
}

export function jurorEvaluations(): JurorEvaluation[] {
  return JUROR_IDS.map((jurorId) => ({
    jurorId,
    vote: VOTES[jurorId],
    pro: juryScore(24, 21, 14, 16),
    con: juryScore(18, 15, 10, 8),
    rationale: koreanText(`${jurorId} 평가 근거입니다.`, OUTPUT_LIMITS.rationale.min),
    perspectiveNotes: koreanText(`${jurorId} 관점 메모입니다.`, OUTPUT_LIMITS.perspectiveNotes.min),
  }))
}

export function judgeJudgmentContext(): JudgeJudgmentContext {
  return {
    ...trialRecord(),
    juryEvaluations: jurorEvaluations(),
  }
}

export function judgeOpeningResponse(): JudgeOpeningResponse {
  return {
    statement: koreanText('재판을 개시합니다.', OUTPUT_LIMITS.statement.min),
    issues: sampleIssues(),
    criteria: sampleCriteria(),
  }
}

export function advocateOpeningResponse(): AdvocateOpeningResponse {
  return {
    statement: koreanText('찬성 모두변론을 시작합니다.', OUTPUT_LIMITS.statement.min),
    arguments: sampleArguments('찬성'),
    limitations: ['소규모 정적 페이지에는 같은 구현 비용이 들지 않을 수 있습니다.'],
  }
}

export function advocateArgumentResponse(): AdvocateArgumentResponse {
  const statement = sampleStatement('pro', '찬성 반론', true)

  return {
    statement: statement.statement,
    arguments: statement.arguments,
    counterArguments: statement.counterArguments,
    limitations: statement.limitations,
  }
}

export function jurorEvaluationResponse(): JurorEvaluationResponse {
  return {
    pro: juryScore(24, 21, 14, 16),
    con: juryScore(18, 15, 10, 8),
    vote: 'pro',
    rationale: koreanText('찬성 측의 대비 기준이 더 구체적입니다.', OUTPUT_LIMITS.rationale.min),
    perspectiveNotes: koreanText(
      '논리 관점에서 인과가 연결됩니다.',
      OUTPUT_LIMITS.perspectiveNotes.min,
    ),
  }
}

export function alignedJudgment(): JudgeJudgmentResponse {
  return {
    verdict: 'pro',
    grounds: [
      '찬성 측이 대비와 사용성의 관계를 화면 단위로 설명했습니다.',
      '반대 측은 비용 한계를 밝혔지만 사용성 저하를 반박하지 못했습니다.',
    ],
    conditions: ['본문과 버튼이 같은 화면에서 비교되는 경우에 적용합니다.'],
    opinion: koreanText('찬성 측의 승소로 판결합니다.', OUTPUT_LIMITS.opinion.min),
    juryReview: koreanText('배심원 다수는 찬성 측을 지지했습니다.', OUTPUT_LIMITS.juryReview.min),
    divergesFromJuryMajority: false,
    divergenceReason: '',
  }
}

export function divergingJudgment(): JudgeJudgmentResponse {
  return {
    ...alignedJudgment(),
    verdict: 'undetermined',
    opinion: koreanText('판단을 유보합니다.', OUTPUT_LIMITS.opinion.min),
    divergesFromJuryMajority: true,
    divergenceReason: '배심원 다수는 찬성이지만 양측 근거가 구현 사례 없이 의견에 머뭅니다.',
  }
}
