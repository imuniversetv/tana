import { useEffect, useRef, useState } from 'react'
import styled from '@emotion/styled'

import { getAgent } from '@/entities/agent'
import { analyzeCase } from '@/features/submit-case'
import { createTrialOrchestrator, TrialOrchestratorError } from '@/features/run-trial'
import type { TrialMessage, TrialPhase, TrialRecord, TrialStatus } from '@/features/run-trial'

const PHASE_LABEL: Record<TrialPhase, string> = {
  opening: '재판 개시',
  statements: '모두변론',
  rebuttals: '반론',
  closings: '최종 변론',
  'jury-deliberation': '배심원 평가',
  judgment: '최종 판결',
}

const STATUS_LABEL: Record<TrialStatus, string> = {
  idle: '대기',
  running: '진행 중',
  completed: '완료',
  failed: '실패',
  cancelled: '취소',
}

const VERDICT_LABEL = {
  pro: '찬성 측 승소',
  con: '반대 측 승소',
  undetermined: '판단 유보',
} as const

export function HomePage() {
  const [orchestrator] = useState(() => createTrialOrchestrator())
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<TrialStatus>('idle')
  const [phase, setPhase] = useState<TrialPhase | null>(null)
  const [messages, setMessages] = useState<TrialMessage[]>([])
  const [record, setRecord] = useState<TrialRecord | null>(null)
  const [activity, setActivity] = useState('')
  const [error, setError] = useState<string | null>(null)
  const runRef = useRef(0)

  useEffect(() => {
    const unsubscribe = orchestrator.subscribe((event) => {
      const current = orchestrator.getRecord()
      setStatus(orchestrator.getStatus())
      setPhase(current?.phase ?? null)
      setMessages(current?.messages ?? [])
      setRecord(current)

      if (event.type === 'phase.started') {
        setActivity(`${PHASE_LABEL[event.phase]} 단계`)
        setError(null)
      }

      if (event.type === 'agent.started') {
        setActivity(`${getAgent(event.agentId).name} 응답 생성 중`)
      }

      if (event.type === 'trial.failed') {
        setError(event.error.message)
        setActivity('')
      }

      if (event.type === 'trial.cancelled') {
        setError('재판을 취소했습니다.')
        setActivity('')
      }

      if (event.type === 'trial.completed') {
        setActivity('')
        setError(null)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [orchestrator])

  const sync = () => {
    const current = orchestrator.getRecord()
    setStatus(orchestrator.getStatus())
    setPhase(current?.phase ?? null)
    setMessages(current?.messages ?? [])
    setRecord(current)
  }

  const handleStart = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!input.trim() || status === 'running') return

    setError(null)
    setMessages([])
    setRecord(null)
    setPhase(null)
    setStatus('running')
    setActivity('논제를 분석하는 중')
    const run = ++runRef.current

    try {
      const analysis = await analyzeCase(input)
      if (run !== runRef.current) return

      if (analysis.status !== 'accepted') {
        setStatus('idle')
        setActivity('')
        setError(`재판을 시작할 수 없습니다. ${analysis.reason}`)
        return
      }

      await orchestrator.start({
        originalText: input.trim(),
        proposition: analysis.proposition,
        category: analysis.category,
        topic: analysis.topic,
        analysis,
      })
    } catch (caught) {
      if (caught instanceof TrialOrchestratorError && caught.kind === 'cancelled') {
        setError('재판을 취소했습니다.')
      } else {
        console.error(caught)
        setError(caught instanceof Error ? caught.message : '재판에 실패했습니다.')
      }
    } finally {
      if (run === runRef.current) {
        sync()
        if (orchestrator.getStatus() !== 'running') setActivity('')
      }
    }
  }

  const handleResume = async () => {
    setError(null)
    setActivity('재판을 다시 시작하는 중')

    try {
      await orchestrator.resume()
    } catch (caught) {
      if (!(caught instanceof TrialOrchestratorError && caught.kind === 'cancelled')) {
        console.error(caught)
        setError(caught instanceof Error ? caught.message : '재판에 실패했습니다.')
      }
    } finally {
      sync()
      if (orchestrator.getStatus() !== 'running') setActivity('')
    }
  }

  const aggregate = record?.juryAggregate
  const judgment = record?.judgment

  return (
    <Page>
      <h1>재판 진행 테스트</h1>

      <form onSubmit={handleStart}>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="UI/UX 또는 웹 퍼블리싱 관련 의견을 입력해주세요."
          maxLength={1000}
          rows={6}
        />
        <Actions>
          <button type="submit" disabled={status === 'running' || !input.trim()}>
            {status === 'running' ? '재판 진행 중...' : '재판 시작'}
          </button>
          {status === 'running' && (
            <button
              type="button"
              onClick={() => {
                runRef.current += 1
                orchestrator.cancel()
                setStatus('cancelled')
                setActivity('')
                setError('재판을 취소했습니다.')
              }}
            >
              취소
            </button>
          )}
          {status === 'failed' && (
            <button type="button" onClick={handleResume}>
              이어서 진행
            </button>
          )}
        </Actions>
      </form>

      <Status>
        상태: {STATUS_LABEL[status]}
        {phase ? ` / ${PHASE_LABEL[phase]}` : ''}
      </Status>
      {activity && <p>{activity}</p>}
      {error && <p role="alert">{error}</p>}

      {messages.length > 0 && (
        <SpeechList aria-live="polite">
          {messages.map((message) => (
            <li key={message.id}>
              <Speaker>
                {getAgent(message.agentId).name}
                <Phase>{PHASE_LABEL[message.phase]}</Phase>
              </Speaker>
              <p>{message.content}</p>
            </li>
          ))}
        </SpeechList>
      )}

      {aggregate && (
        <section>
          <h2>배심원 집계</h2>
          <p>
            찬성 {aggregate.proVotes}표, 반대 {aggregate.conVotes}표, 기권 {aggregate.abstainVotes}
            표
          </p>
          <p>
            평균 점수 찬성 {aggregate.proAverageScore.toFixed(1)}점, 반대{' '}
            {aggregate.conAverageScore.toFixed(1)}점
          </p>
        </section>
      )}

      {judgment && (
        <section>
          <h2>판결: {VERDICT_LABEL[judgment.verdict]}</h2>
          <p>{judgment.opinion}</p>
          {judgment.divergesFromJuryMajority && judgment.divergenceReason && (
            <p>배심원 다수 의견과 다른 이유: {judgment.divergenceReason}</p>
          )}
        </section>
      )}
    </Page>
  )
}

const Page = styled.main`
  width: min(760px, 100%);
  margin: 0 auto;
  padding: 40px 20px 80px;
  display: grid;
  gap: 16px;

  h1,
  h2,
  p {
    margin: 0;
  }

  h1 {
    font-size: 32px;
  }

  form {
    display: grid;
    gap: 12px;
  }

  textarea {
    width: 100%;
    padding: 12px;
    font: inherit;
    resize: vertical;
  }

  section {
    display: grid;
    gap: 8px;
  }
`

const Actions = styled.div`
  display: flex;
  gap: 8px;

  button {
    padding: 8px 14px;
    font: inherit;
  }
`

const Status = styled.p`
  color: #444;
`

const SpeechList = styled.ol`
  display: grid;
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: grid;
    gap: 8px;
    padding-top: 16px;
    border-top: 1px solid #ddd;
  }

  p {
    line-height: 1.6;
    white-space: pre-wrap;
  }
`

const Speaker = styled.strong`
  display: flex;
  gap: 8px;
  align-items: baseline;
`

const Phase = styled.span`
  color: #666;
  font-size: 14px;
  font-weight: 400;
`
