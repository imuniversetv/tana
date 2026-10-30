import { useMemo, useRef, useState } from 'react'
import styled from '@emotion/styled'

import { AGENT_IDS, getAgent, listAgents } from '@/entities/agent'
import type { AgentId } from '@/entities/agent'

import { runAgent } from '../api/runAgent'
import { createPlaygroundRequest } from '../lib/createPlaygroundInput'
import type { PlaygroundSource } from '../lib/createPlaygroundInput'
import { SUPPORTED_TASKS } from '../lib/validateAgentTask'
import type { AgentTask } from '../lib/validateAgentTask'
import { AgentExecutionError } from '../model/errors'

const TASK_LABEL: Record<AgentTask, string> = {
  opening: '모두변론',
  rebuttal: '반론',
  closing: '최종 변론',
  evaluation: '평가',
  judgment: '최종 판결',
}

interface AgentPlaygroundProps {
  source: PlaygroundSource | null
}

export function AgentPlayground({ source }: AgentPlaygroundProps) {
  const agents = listAgents()
  const [agentId, setAgentId] = useState<AgentId>('judge')
  const [task, setTask] = useState<AgentTask>('opening')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<unknown>(null)
  const abortRef = useRef<AbortController | null>(null)

  const agent = getAgent(agentId)
  const tasks = SUPPORTED_TASKS[agent.role]
  const request = useMemo(
    () => createPlaygroundRequest(agentId, task, source),
    [agentId, task, source],
  )

  const handleAgentChange = (value: string) => {
    if (!isAgentId(value)) return

    const nextAgent = getAgent(value)
    const nextTasks = SUPPORTED_TASKS[nextAgent.role]
    setAgentId(value)
    setTask(nextTasks.some((item) => item === task) ? task : nextTasks[0])
    setResult(null)
    setError(null)
  }

  const handleRun = async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const output = await runAgent(request.input, { signal: controller.signal })
      setResult(output)
    } catch (caught) {
      console.error(caught)

      if (caught instanceof AgentExecutionError && caught.code === 'aborted') {
        setError('요청을 중단했습니다.')
        return
      }

      setError(
        caught instanceof AgentExecutionError
          ? caught.message
          : 'Agent 실행에 실패했습니다. 다시 시도해주세요.',
      )
    } finally {
      if (abortRef.current === controller) {
        setLoading(false)
      }
    }
  }

  const handleAbort = () => {
    abortRef.current?.abort()
  }

  return (
    <Section>
      <h2>AI Agent 테스트</h2>
      <p>
        역할과 작업을 고르면 해당 Agent만 호출합니다. 재판 개시는 위에서 통과한 논제를 사용하고,
        나머지 작업은 샘플 재판 기록으로 실행합니다.
      </p>

      <Fields>
        <label>
          Agent
          <select value={agentId} onChange={(event) => handleAgentChange(event.target.value)}>
            {agents.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          작업
          <select
            value={task}
            onChange={(event) => {
              const next = event.target.value
              if (!isAgentTask(next, tasks)) return
              setTask(next)
              setResult(null)
              setError(null)
            }}
          >
            {tasks.map((item) => (
              <option key={item} value={item}>
                {item === 'opening' && agent.role === 'judge' ? '재판 개시' : TASK_LABEL[item]}
              </option>
            ))}
          </select>
        </label>
      </Fields>

      <Persona>{agent.persona}</Persona>
      <p>입력: {request.sourceLabel}</p>

      <Actions>
        <button type="button" onClick={handleRun} disabled={loading}>
          {loading ? '응답 생성 중...' : 'Agent 실행'}
        </button>
        {loading && (
          <button type="button" onClick={handleAbort}>
            중단
          </button>
        )}
      </Actions>

      {error && <p role="alert">{error}</p>}

      {result !== null && (
        <section aria-live="polite">
          <h3>응답</h3>
          <Speech>{readableText(result)}</Speech>
          <ResultJson>{JSON.stringify(result, null, 2)}</ResultJson>
        </section>
      )}
    </Section>
  )
}

function readableText(result: unknown): string {
  if (!isRecord(result)) return ''

  if (typeof result.opinion === 'string') return result.opinion
  if (typeof result.statement === 'string') return result.statement
  if (typeof result.rationale === 'string') return result.rationale

  return ''
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isAgentId(value: string): value is AgentId {
  return (AGENT_IDS as readonly string[]).includes(value)
}

function isAgentTask(value: string, tasks: readonly AgentTask[]): value is AgentTask {
  return (tasks as readonly string[]).includes(value)
}

const Section = styled.section`
  display: grid;
  gap: 12px;

  h2,
  h3,
  p {
    margin: 0;
  }

  select {
    display: block;
    width: 100%;
    margin-top: 4px;
    padding: 8px;
    font: inherit;
  }
`

const Fields = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const Persona = styled.p`
  color: #444;
`

const Actions = styled.div`
  display: flex;
  gap: 8px;

  button {
    padding: 8px 14px;
    font: inherit;
  }
`

const Speech = styled.p`
  line-height: 1.6;
  white-space: pre-wrap;
`

const ResultJson = styled.pre`
  margin: 0;
  padding: 12px;
  overflow: auto;
  max-height: 480px;
  border: 1px solid #ddd;
  white-space: pre-wrap;
`
