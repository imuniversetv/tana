import styled from '@emotion/styled'

import caseAnalysisBackground from '@/assets/images/case-analysis-background.png'
import type { CaseAnalysis } from '@/entities/case'
import { Button } from '@/shared/ui'

interface CaseAnalysisResultPageProps {
  analysis: CaseAnalysis
  onBack: () => void
}

export function CaseAnalysisResultPage({ analysis, onBack }: CaseAnalysisResultPageProps) {
  return (
    <Screen>
      <Background src={caseAnalysisBackground} alt="" />
      <Center>
        <Content>
          <Title>{resultTitle(analysis)}</Title>
          {analysis.proposition && <Proposition>{analysis.proposition}</Proposition>}
          <Reason>{analysis.reason}</Reason>
          <Button variant="light" label="다시 입력하기" onClick={onBack} />
        </Content>
      </Center>
    </Screen>
  )
}

function resultTitle(analysis: CaseAnalysis) {
  if (analysis.status === 'out_of_scope') return '이 논제는 재판 범위를 벗어납니다.'
  if (analysis.status === 'not_debatable') return '이 논제는 찬반으로 재판하기 어렵습니다.'
  if (analysis.status === 'needs_clarification') return '논제를 더 구체적으로 적어 주세요.'
  return '이 논제로는 재판을 시작할 수 없습니다.'
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

const Center = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
`

const Content = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: min(800px, calc(100% - 48px));
  padding: 48px 0;
`

const Title = styled.h1`
  margin: 0;
  color: #fbf4e4;
  font-size: 36px;
  font-weight: 400;
  line-height: 1.4;
  text-align: center;
`

const Proposition = styled.p`
  margin: 20px 0 0;
  color: #ffffff;
  font-size: 24px;
  line-height: 1.5;
  text-align: center;
`

const Reason = styled.p`
  margin: 24px 0 32px;
  color: #fbf4e4;
  font-size: 22px;
  line-height: 1.6;
  text-align: center;
  white-space: pre-wrap;
`
