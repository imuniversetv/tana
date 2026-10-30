import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AgentExecutionError, runAgent } from '@/features/run-trial'
import { StructuredContentError } from '@/shared/api/gemini/errors'

import { MAX_OUTPUT_TOKENS } from '../config/outputLimits'
import {
  advocateOpeningContext,
  advocateOpeningResponse,
  advocateRebuttalContext,
  alignedJudgment,
  divergingJudgment,
  judgeJudgmentContext,
  judgeOpeningContext,
  judgeOpeningResponse,
  jurorEvaluationContext,
  jurorEvaluationResponse,
  PROPOSITION,
} from '../model/fixtures'

vi.mock('@/shared/config/firebase', () => ({
  firebaseApp: {},
}))

vi.mock('@/shared/api/gemini/client', () => ({
  geminiAI: {},
  geminiModel: {
    generateContent: vi.fn(),
  },
}))

describe('runAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('판사 재판 개시를 독립적으로 호출한다', async () => {
    const generate = vi.fn().mockResolvedValue(judgeOpeningResponse())
    const result = await runAgent(
      { agentId: 'judge', task: 'opening', context: judgeOpeningContext() },
      { generate },
    )

    expect(result.issues).toHaveLength(2)
    expect(generate).toHaveBeenCalledTimes(1)
    const request = generate.mock.calls[0]?.[0]
    expect(request.systemInstruction).toContain(
      '확인되지 않은 통계, 연구 결과 또는 출처를 만들어내지 않습니다.',
    )
    expect(request.prompt).toContain(PROPOSITION)
    expect(request.prompt).toContain('분석 대상 데이터')
    expect(request.maxOutputTokens).toBe(MAX_OUTPUT_TOKENS.opening)
  })

  it('찬성 측과 반대 측에 같은 출력 한도를 적용한다', async () => {
    const generate = vi.fn().mockResolvedValue(advocateOpeningResponse())

    await runAgent(
      { agentId: 'pro-advocate', task: 'opening', context: advocateOpeningContext() },
      { generate },
    )
    await runAgent(
      { agentId: 'con-advocate', task: 'opening', context: advocateOpeningContext() },
      { generate },
    )

    expect(generate.mock.calls[0]?.[0].maxOutputTokens).toBe(MAX_OUTPUT_TOKENS.opening)
    expect(generate.mock.calls[1]?.[0].maxOutputTokens).toBe(MAX_OUTPUT_TOKENS.opening)
    expect(generate.mock.calls[0]?.[0].responseSchema).toBe(
      generate.mock.calls[1]?.[0].responseSchema,
    )
    expect(generate.mock.calls[0]?.[0].prompt).toContain('사용자 논제를 지지합니다.')
    expect(generate.mock.calls[1]?.[0].prompt).toContain('사용자 논제에 반대합니다.')
  })

  it('잘못된 입력과 지원하지 않는 작업은 API 생성 함수를 호출하지 않는다', async () => {
    const generate = vi.fn()
    const context = judgeOpeningContext()

    await expect(
      runAgent(
        {
          agentId: 'judge',
          task: 'opening',
          context: { ...context, proposition: '버튼 대비는 항상 본문보다 높아야 한다.' },
        },
        { generate },
      ),
    ).rejects.toMatchObject({ name: 'AgentExecutionError', code: 'invalid_context' })

    await expect(
      runAgent(
        { agentId: 'judge', task: 'rebuttal', context: advocateRebuttalContext('pro') } as never,
        { generate },
      ),
    ).rejects.toMatchObject({ code: 'unsupported_task' })

    await expect(
      runAgent(
        { agentId: 'juror-logic', task: 'opening', context: advocateOpeningContext() } as never,
        { generate },
      ),
    ).rejects.toMatchObject({ code: 'unsupported_task' })

    expect(generate).not.toHaveBeenCalled()
  })

  it('담당 입장과 다른 반론 입력을 거부한다', async () => {
    const generate = vi.fn()

    await expect(
      runAgent(
        { agentId: 'con-advocate', task: 'rebuttal', context: advocateRebuttalContext('pro') },
        { generate },
      ),
    ).rejects.toBeInstanceOf(AgentExecutionError)

    expect(generate).not.toHaveBeenCalled()
  })

  it('스키마에 맞지 않는 응답과 실패한 요청을 한 번만 처리한다', async () => {
    const invalid = vi.fn().mockResolvedValue({ statement: '' })

    await expect(
      runAgent(
        { agentId: 'judge', task: 'opening', context: judgeOpeningContext() },
        { generate: invalid },
      ),
    ).rejects.toMatchObject({ code: 'schema_mismatch' })
    expect(invalid).toHaveBeenCalledTimes(1)

    const failed = vi
      .fn()
      .mockRejectedValue(
        new StructuredContentError('request_failed', 'Gemini API 호출에 실패했습니다.'),
      )

    await expect(
      runAgent(
        { agentId: 'judge', task: 'opening', context: judgeOpeningContext() },
        { generate: failed },
      ),
    ).rejects.toMatchObject({ code: 'request_failed' })
    expect(failed).toHaveBeenCalledTimes(1)
  })

  it('중단된 요청을 실행하지 않는다', async () => {
    const controller = new AbortController()
    controller.abort()
    const generate = vi.fn()

    await expect(
      runAgent(
        { agentId: 'judge', task: 'opening', context: judgeOpeningContext() },
        { signal: controller.signal, generate },
      ),
    ).rejects.toMatchObject({ code: 'aborted' })
    expect(generate).not.toHaveBeenCalled()
  })

  it('배심원 응답에 요청한 배심원 식별자를 붙인다', async () => {
    const generate = vi.fn().mockResolvedValue({
      ...jurorEvaluationResponse(),
      jurorId: 'juror-evidence',
    })
    const result = await runAgent(
      { agentId: 'juror-logic', task: 'evaluation', context: jurorEvaluationContext() },
      { generate },
    )

    expect(result.jurorId).toBe('juror-logic')
    expect(result.vote).toBe('pro')
    expect(result.pro.total).toBe(75)
    expect(generate.mock.calls[0]?.[0].prompt).not.toContain('juror-evidence')
  })

  it('최종 판결의 결과 타입과 배심원 다수 의견 차이를 검증한다', async () => {
    const generate = vi.fn().mockResolvedValue(alignedJudgment())
    const aligned = await runAgent(
      { agentId: 'judge', task: 'judgment', context: judgeJudgmentContext() },
      { generate },
    )

    expect(aligned.verdict).toBe('pro')

    generate.mockResolvedValueOnce({ ...divergingJudgment(), divergenceReason: '   ' })
    await expect(
      runAgent(
        { agentId: 'judge', task: 'judgment', context: judgeJudgmentContext() },
        { generate },
      ),
    ).rejects.toMatchObject({ code: 'schema_mismatch' })

    generate.mockResolvedValueOnce(divergingJudgment())
    const diverging = await runAgent(
      { agentId: 'judge', task: 'judgment', context: judgeJudgmentContext() },
      { generate },
    )

    expect(diverging.verdict).toBe('undetermined')
    expect(diverging.divergesFromJuryMajority).toBe(true)
  })
})
