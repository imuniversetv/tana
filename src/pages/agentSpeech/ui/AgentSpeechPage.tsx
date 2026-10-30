import styled from '@emotion/styled'

import conAdvocateBackground from '@/assets/images/con-advocate-background.png'
import judgeBackground from '@/assets/images/Judge-background.png'
import jurorBackground from '@/assets/images/juror-background.png'
import proAdvocateBackground from '@/assets/images/pro-advocate-background.png'
import type { AgentId } from '@/entities/agent'
import { AgentSpeech, type AgentSpeechProps } from '@/shared/ui'

const ROLE_BACKGROUND: Record<AgentId, string> = {
  judge: judgeBackground,
  'pro-advocate': proAdvocateBackground,
  'con-advocate': conAdvocateBackground,
  'juror-logic': jurorBackground,
  'juror-evidence': jurorBackground,
  'juror-practicality': jurorBackground,
  'juror-user-experience': jurorBackground,
  'juror-critical-thinking': jurorBackground,
}

export function AgentSpeechPage({ role, ...speech }: AgentSpeechProps) {
  return (
    <Screen>
      <Background src={ROLE_BACKGROUND[role]} alt="배경 이미지" />
      <AgentSpeech role={role} {...speech} />
    </Screen>
  )
}

const Screen = styled.section`
  position: relative;
  width: 100cqw;
  height: 100vh;
  margin-left: calc(50% - 50cqw);
`

const Background = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`
