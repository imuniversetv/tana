import styled from '@emotion/styled'

import arrowDoubleIcon from '@/assets/icons/arrow-double.svg'
import conAdvocateProfile from '@/assets/images/con-advocate-profile.png'
import judgeProfile from '@/assets/images/Judge-profile.png'
import jurorProfile from '@/assets/images/juror-profile.png'
import proAdvocateProfile from '@/assets/images/pro-advocate-profile.png'
import { getAgent } from '@/entities/agent'
import type { AgentId } from '@/entities/agent'

const PROFILE_IMAGE: Record<AgentId, string> = {
  judge: judgeProfile,
  'pro-advocate': proAdvocateProfile,
  'con-advocate': conAdvocateProfile,
  'juror-logic': jurorProfile,
  'juror-evidence': jurorProfile,
  'juror-practicality': jurorProfile,
  'juror-user-experience': jurorProfile,
  'juror-critical-thinking': jurorProfile,
}

export interface AgentSpeechProps {
  role: AgentId
  message: string
  onNext: () => void
  disabled?: boolean
}

export function AgentSpeech({ role, message, onNext, disabled = false }: AgentSpeechProps) {
  return (
    <>
      <Profile src={PROFILE_IMAGE[role]} alt="프로필 이미지" />
      <Bar>
        <Content>
          <Role>{getAgent(role).name}</Role>
          <Message>{message}</Message>
          <NextButton type="button" onClick={onNext} disabled={disabled} aria-label="다음 대답">
            <img src={arrowDoubleIcon} alt="" width={35} height={30} />
          </NextButton>
        </Content>
      </Bar>
    </>
  )
}

const Profile = styled.img`
  position: absolute;
  bottom: 300px;
  z-index: 1;
  height: 340px;
  width: auto;
  max-width: none;
  pointer-events: none;
  left: 50%;
  transform: translateX(-50%);
`

const Bar = styled.section`
  position: absolute;
  left: 50%;
  bottom: 40px;
  z-index: 2;
  transform: translateX(-50%);
  width: 100cqw;
  height: 260px;
  background: #555555;
  border-top: 2px solid #e5a229;
  border-bottom: 2px solid #e5a229;
`

const Content = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: ${({ theme }) => theme.layout.width}px;
  height: 100%;
  margin: 0 auto;
  padding: 60px 52px 40px 0;
`

const Role = styled.p`
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: auto;
  min-width: 340px;
  height: 42px;
  padding: 0 20px;
  margin: 0;
  border: 2px solid #e5a229;
  background: #fbf4e4;
  color: ${({ theme }) => theme.colors.text};
  font-size: 22px;
  line-height: 1;
  white-space: nowrap;
  transform: translateY(-50%);
`

const Message = styled.p`
  width: 100%;
  height: 100%;
  color: #ffffff;
  font-size: 20px;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-y: auto;
`

const NextButton = styled.button`
  position: absolute;
  right: 0;
  bottom: 40px;
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border: 0;
  background: transparent;

  &:disabled {
    cursor: default;
    opacity: 0.4;
  }
`
