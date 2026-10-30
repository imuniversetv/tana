import { Schema } from 'firebase/ai'

import { JURY_RUBRIC, JURY_TOTAL_MAX } from '@/entities/trial'

import { OUTPUT_LIMITS } from '../config/outputLimits'

const limits = OUTPUT_LIMITS

function rubricMax(key: (typeof JURY_RUBRIC)[number]['key']): number {
  const item = JURY_RUBRIC.find((entry) => entry.key === key)

  if (!item) {
    throw new Error(`배심원 평가 항목이 없습니다: ${key}`)
  }

  return item.maxScore
}

const argumentPointSchema = Schema.object({
  description: '핵심 주장과 근거',
  properties: {
    claim: Schema.string({ description: '핵심 주장' }),
    reasoning: Schema.string({ description: '기술적·논리적 근거' }),
  },
})

const counterArgumentSchema = Schema.object({
  description: '상대 주장에 대한 반론',
  properties: {
    targetClaim: Schema.string({ description: '입력에 있는 상대 주장' }),
    rebuttal: Schema.string({ description: '반론' }),
    concession: Schema.string({ description: '인정하는 부분. 없으면 그 사실을 적습니다.' }),
  },
})

const issueSchema = Schema.object({
  description: '핵심 쟁점',
  properties: {
    title: Schema.string({ description: '쟁점 제목' }),
    description: Schema.string({ description: '기술적 판단이 필요한 내용' }),
  },
})

const criterionSchema = Schema.object({
  description: '공통 평가 기준',
  properties: {
    name: Schema.string({ description: '기준 이름' }),
    description: Schema.string({ description: '기준 설명' }),
  },
})

const jurySideSchema = Schema.object({
  description: '한 쪽 변론의 평가 점수',
  properties: {
    logicalValidity: Schema.integer({
      description: '논리적 타당성',
      minimum: 0,
      maximum: rubricMax('logicalValidity'),
    }),
    evidenceReliability: Schema.integer({
      description: '근거의 신뢰성',
      minimum: 0,
      maximum: rubricMax('evidenceReliability'),
    }),
    rebuttalResponse: Schema.integer({
      description: '반론 대응 능력',
      minimum: 0,
      maximum: rubricMax('rebuttalResponse'),
    }),
    overallPersuasiveness: Schema.integer({
      description: '전체 설득력',
      minimum: 0,
      maximum: rubricMax('overallPersuasiveness'),
    }),
    total: Schema.integer({
      description: '항목 점수의 합계',
      minimum: 0,
      maximum: JURY_TOTAL_MAX,
    }),
  },
})

export const judgeOpeningGeminiSchema = Schema.object({
  description: '재판 개시 결과',
  properties: {
    statement: Schema.string({ description: '재판 개시 발언' }),
    issues: Schema.array({
      description: '핵심 쟁점',
      items: issueSchema,
      minItems: limits.issue.min,
      maxItems: limits.issue.max,
    }),
    criteria: Schema.array({
      description: '공통 평가 기준',
      items: criterionSchema,
      minItems: limits.criterion.min,
      maxItems: limits.criterion.max,
    }),
  },
})

export const judgeJudgmentGeminiSchema = Schema.object({
  description: '최종 판결',
  properties: {
    verdict: Schema.enumString({
      description: 'pro, con, undetermined',
      enum: ['pro', 'con', 'undetermined'],
    }),
    grounds: Schema.array({
      description: '핵심 판단 근거',
      items: Schema.string({ description: '판단 근거' }),
      minItems: limits.grounds.min,
      maxItems: limits.grounds.max,
    }),
    conditions: Schema.array({
      description: '조건 및 예외. 없으면 빈 배열',
      items: Schema.string({ description: '조건 또는 예외' }),
      maxItems: limits.conditions.max,
    }),
    opinion: Schema.string({ description: '최종 판결문' }),
    juryReview: Schema.string({ description: '배심원 평가 검토' }),
    divergesFromJuryMajority: Schema.boolean({
      description: '다수 의견과 판결이 다르면 true',
    }),
    divergenceReason: Schema.string({
      description: '다수 의견과 다를 때의 이유. 다르지 않으면 빈 문자열',
    }),
  },
})

export const advocateOpeningGeminiSchema = Schema.object({
  description: '모두변론',
  properties: {
    statement: Schema.string({ description: '모두변론 발언' }),
    arguments: Schema.array({
      description: '핵심 주장',
      items: argumentPointSchema,
      minItems: limits.argument.min,
      maxItems: limits.argument.max,
    }),
    limitations: Schema.array({
      description: '조건과 한계',
      items: Schema.string({ description: '한계' }),
      minItems: limits.limitation.min,
      maxItems: limits.limitation.max,
    }),
  },
})

export const advocateArgumentGeminiSchema = Schema.object({
  description: '반론 또는 최종 변론',
  properties: {
    statement: Schema.string({ description: '법정 발언' }),
    arguments: Schema.array({
      description: '핵심 주장',
      items: argumentPointSchema,
      minItems: limits.argument.min,
      maxItems: limits.argument.max,
    }),
    counterArguments: Schema.array({
      description: '상대 주장에 대한 반론',
      items: counterArgumentSchema,
      minItems: limits.counter.min,
      maxItems: limits.counter.max,
    }),
    limitations: Schema.array({
      description: '조건과 한계',
      items: Schema.string({ description: '한계' }),
      minItems: limits.limitation.min,
      maxItems: limits.limitation.max,
    }),
  },
})

export const jurorEvaluationGeminiSchema = Schema.object({
  description: '배심원 평가',
  properties: {
    pro: jurySideSchema,
    con: jurySideSchema,
    vote: Schema.enumString({
      description: 'pro, con, abstain',
      enum: ['pro', 'con', 'abstain'],
    }),
    rationale: Schema.string({ description: '평가 근거' }),
    perspectiveNotes: Schema.string({ description: '개별 평가 관점의 추가 검토' }),
  },
})
