import { describe, expect, it } from 'vitest'

import { getAgent, listJurors } from '@/entities/agent'

import { advocateSharedLimitText } from '../config/advocate.prompt'
import { commonPrompt } from '../config/common.prompt'
import { judgeRolePrompt } from '../config/judge.prompt'
import { AgentExecutionError } from '../model/errors'
import {
  advocateOpeningContext,
  judgeJudgmentContext,
  judgeOpeningContext,
  jurorEvaluationContext,
  PROPOSITION,
} from '../model/fixtures'
import { buildAgentPrompt } from './buildAgentPrompt'

describe('buildAgentPrompt', () => {
  it('공통 프롬프트와 역할 프롬프트를 시스템 지침으로 조합한다', () => {
    const prompt = buildAgentPrompt(getAgent('judge'), 'opening', judgeOpeningContext())

    expect(prompt.systemInstruction.startsWith(commonPrompt)).toBe(true)
    expect(prompt.systemInstruction).toContain(judgeRolePrompt)
    expect(prompt.systemInstruction).toContain(
      '확인되지 않은 통계, 연구 결과 또는 출처를 만들어내지 않습니다.',
    )
    expect(prompt.userPrompt).toContain('현재 작업은 재판 개시입니다.')
    expect(prompt.userPrompt).toContain(PROPOSITION)
    expect(prompt.userPrompt).toContain('분석 대상 데이터')
    expect(prompt.systemInstruction).not.toContain(PROPOSITION)
  })

  it('찬성 측과 반대 측에 같은 분량 제한과 다른 입장을 적용한다', () => {
    const pro = buildAgentPrompt(getAgent('pro-advocate'), 'opening', advocateOpeningContext())
    const con = buildAgentPrompt(getAgent('con-advocate'), 'opening', advocateOpeningContext())
    const limitText = advocateSharedLimitText()

    expect(pro.systemInstruction).toContain(
      '당신의 담당 입장은 찬성입니다. 사용자 논제를 지지합니다.',
    )
    expect(con.systemInstruction).toContain(
      '당신의 담당 입장은 반대입니다. 사용자 논제에 반대합니다.',
    )
    expect(pro.systemInstruction).toContain(limitText)
    expect(con.systemInstruction).toContain(limitText)
    expect(pro.systemInstruction).toContain('입력에 없는 상대 주장을 만들어 반박하지 않습니다.')
    expect(con.systemInstruction).toContain('입력에 없는 상대 주장을 만들어 반박하지 않습니다.')
    expect(pro.userPrompt).toContain('counterArguments를 만들지 않습니다.')
    expect(con.userPrompt).toContain('counterArguments를 만들지 않습니다.')
  })

  it('배심원에게 같은 재판 기록을 주고 평가 관점만 역할 지침에서 나눈다', () => {
    const context = jurorEvaluationContext()
    const prompts = listJurors().map((juror) => buildAgentPrompt(juror, 'evaluation', context))
    const records = prompts.map((prompt) => trialRecordJson(prompt.userPrompt))

    expect(new Set(records).size).toBe(1)
    expect(records[0]).not.toContain('juryEvaluations')
    expect(records[0]).not.toContain('juror-logic')
    expect(prompts[0]?.userPrompt).toBe(prompts[1]?.userPrompt)

    for (const juror of listJurors()) {
      const prompt = buildAgentPrompt(juror, 'evaluation', context)

      expect(prompt.systemInstruction).toContain(juror.name)
      expect(prompt.systemInstruction).toContain(juror.focus[0])
      expect(prompt.userPrompt).not.toContain(juror.name)

      for (const other of listJurors()) {
        if (other.id === juror.id) continue
        expect(prompt.systemInstruction).not.toContain(other.name)
      }
    }

    expect(
      buildAgentPrompt(getAgent('juror-logic'), 'evaluation', context).systemInstruction,
    ).toContain('논리적 비약')
    expect(
      buildAgentPrompt(getAgent('juror-evidence'), 'evaluation', context).systemInstruction,
    ).not.toContain('논리적 비약')
    expect(
      buildAgentPrompt(getAgent('juror-evidence'), 'evaluation', context).systemInstruction,
    ).toContain('근거의 검증 가능성')
  })

  it('최종 판결 프롬프트에 프로그램이 집계한 투표를 포함한다', () => {
    const prompt = buildAgentPrompt(getAgent('judge'), 'judgment', judgeJudgmentContext())

    expect(prompt.userPrompt).toContain('찬성 3표, 반대 1표, 기권 1표, 다수 의견: pro')
    expect(prompt.userPrompt).toContain('juror-logic 평가 근거입니다.')
    expect(prompt.userPrompt).toContain('분석 대상 데이터')
  })

  it('지원하지 않는 작업을 조합하지 않는다', () => {
    expect(() => buildAgentPrompt(getAgent('judge'), 'rebuttal', {})).toThrow(AgentExecutionError)
    expect(() => buildAgentPrompt(getAgent('juror-logic'), 'opening', {})).toThrow(
      AgentExecutionError,
    )
  })
})

function trialRecordJson(userPrompt: string): string {
  const start = userPrompt.indexOf('{')
  const tally = userPrompt.indexOf('\n\n[배심원 투표 집계]')

  return userPrompt.slice(start, tally === -1 ? undefined : tally).trim()
}
