import { nvidia, FEEDBACK_MODEL } from './nvidia'
import type { Message, Scenario, AxisKey, AxisScores, TokenUsage } from '@/types'

export interface FeedbackResult {
  overall_score: number
  axis_scores: AxisScores
  summary: string
  improvements: string[]
  safety_notice: string | null
  raw_analysis: string
  usage: TokenUsage
}

const AXIS_KEYS: AxisKey[] = ['communication', 'empathy', 'assertion', 'regulation', 'mutuality']

const SYSTEM_PROMPT = `너는 사회적 의사소통에 어려움을 겪는 사용자의 대화 능력을 평가하고 훈련 피드백을 제공하는 전문 평가 에이전트다. 너의 역할은 정신건강의학과 의사, 임상심리사, 상담심리사 수준의 전문적 태도를 참고하되, 실제 의학적 진단이나 치료 판단을 대신하지 않는 것이다.

평가의 목적은 사용자의 정신질환 여부를 판단하는 것이 아니라, 대화 장면에서 관찰 가능한 사회적 의사소통 기술을 구조적으로 평가하고 개선 방향을 제안하는 것이다. 모든 평가는 대한민국 정신건강 재활 및 사회기술훈련에서 중요하게 다루는 의사소통, 대인관계, 공감, 자기주장, 자기조절, 사회적 문제해결의 관점에 맞춘다.

너는 입력된 대화 내용을 다음 5개 지표로 평가한다.

1. communication (의사소통 명료성)
- 말의 목적, 핵심 메시지, 설명의 순서, 질문에 대한 답변의 적절성을 평가한다.
- 불명확한 표현, 논점 이탈, 과도한 생략, 맥락 부족을 감점한다.

2. empathy (공감 및 정서 인식)
- 상대의 감정과 입장을 인식하고 반영하는지를 평가한다.
- 상대 감정을 무시하거나, 성급히 판단하거나, 방어적으로 반응하면 감점한다.

3. assertion (자기주장 및 욕구 표현)
- 자신의 생각, 감정, 요청, 거절, 경계를 적절히 표현하는지 평가한다.
- 지나친 회피, 수동성, 공격성, 비난 중심 표현을 감점한다.

4. regulation (자기조절 및 정서 조절)
- 긴장, 불안, 분노, 당황이 있는 상황에서도 대화를 유지하고 조절하는지 평가한다.
- 감정 폭발, 과도한 위축, 대화 중단, 충동적 반응을 감점한다.

5. mutuality (상호성 및 사회적 적절성)
- 상대의 말에 반응하고, 대화 차례를 지키며, 질문과 경청을 통해 상호작용을 이어가는지 평가한다.
- 일방적 말하기, 상대 반응 무시, 상황에 맞지 않는 표현, 갈등 악화를 감점한다.

각 항목은 0점부터 20점까지 평가한다.
- 0~3점: 관찰 불가 또는 심각한 어려움
- 4~7점: 매우 제한적 수행
- 8~11점: 부분 수행 가능하나 불안정함
- 12~15점: 기본 수행 가능
- 16~18점: 안정적 수행
- 19~20점: 매우 자연스럽고 효과적인 수행

총점은 5개 항목 점수의 합 (0-100점) 이다.

평가 원칙:
- 진단명을 단정하지 않는다.
- "비정상", "문제 있음", "사회성이 없다" 같은 낙인 표현을 사용하지 않는다.
- 사용자의 말투가 서툴러도 존중하는 표현을 사용한다.
- 평가보다 훈련 가능성과 다음 행동을 강조한다.
- 근거가 부족하면 "대화 자료만으로는 판단이 제한적이다"라고 명시한다.
- 자해 위험, 타해 위험, 심한 망상·환청, 극심한 불안이나 우울, 일상 기능 저하가 의심되는 경우 safety_notice 필드에 전문기관 안내를 작성한다. 위험 신호가 없으면 safety_notice 는 null 로 둔다.

반드시 다음 JSON 형식으로만 응답하라. 다른 텍스트는 일절 출력하지 마라:

{
  "summary": "대화 전반의 강점과 가장 중요한 개선 포인트를 3~5문장으로 설명",
  "scores": {
    "communication": { "score": 0-20 정수, "rationale": "관찰된 표현/행동 근거 2~3문장" },
    "empathy":       { "score": 0-20 정수, "rationale": "..." },
    "assertion":     { "score": 0-20 정수, "rationale": "..." },
    "regulation":    { "score": 0-20 정수, "rationale": "..." },
    "mutuality":     { "score": 0-20 정수, "rationale": "..." }
  },
  "improvements": [
    "각 항목별로 바로 연습할 수 있는 구체적 행동 제안 (행동 단위)",
    "예: '상대 감정을 먼저 한 문장으로 반영하기'",
    "예: '내 요청을 ~나는 ~해서 ~했으면 좋겠다 형식으로 말하기'",
    "예: '대답 전 2초 멈추고 핵심부터 말하기'",
    "총 5개 항목 (각 평가 축당 1개)"
  ],
  "safety_notice": null
}`

export async function generateFeedbackReport(
  scenario: Scenario,
  messages: Message[],
): Promise<FeedbackResult> {
  const conversationText = messages
    .map((m) => {
      const prefix = m.role === 'user' ? '사용자' : scenario.persona_config.name
      return `${prefix}: ${m.content}`
    })
    .join('\n')

  const userPrompt = `[시나리오]
${scenario.title} — ${scenario.description}

[대화 기록]
${conversationText}

위 대화를 5개 지표로 평가하고 지정된 JSON 형식으로 응답하라.`

  // Streamed: the report is a long generation, and a non-streamed response holds
  // the socket idle until it's fully done — long enough to be dropped behind NAT
  // (read ETIMEDOUT). Streaming keeps bytes flowing so the connection stays alive.
  const stream = await nvidia.chat.completions.create({
    model: FEEDBACK_MODEL,
    max_tokens: 2048,
    stream: true,
    stream_options: { include_usage: true },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  })

  let text = ''
  let usage: { prompt_tokens?: number; completion_tokens?: number } | undefined
  for await (const chunk of stream) {
    text += chunk.choices[0]?.delta?.content ?? ''
    if (chunk.usage) usage = chunk.usage
  }

  const parsed = parseFeedback(text)

  return {
    ...parsed,
    raw_analysis: text,
    usage: {
      input_tokens: usage?.prompt_tokens ?? 0,
      output_tokens: usage?.completion_tokens ?? 0,
    },
  }
}

function parseFeedback(text: string): {
  overall_score: number
  axis_scores: AxisScores
  summary: string
  improvements: string[]
  safety_notice: string | null
} {
  const fallback = neutralFallback()

  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return fallback

  let json: unknown
  try {
    json = JSON.parse(match[0])
  } catch {
    return fallback
  }

  if (typeof json !== 'object' || json === null) return fallback
  const j = json as Record<string, unknown>

  const clamp20 = (v: unknown) => Math.min(20, Math.max(0, Math.round(Number(v) || 0)))

  const scoresRaw = (j.scores ?? {}) as Record<string, unknown>
  const axis_scores = AXIS_KEYS.reduce((acc, key) => {
    const detail = (scoresRaw[key] ?? {}) as Record<string, unknown>
    acc[key] = {
      score: clamp20(detail.score),
      rationale: typeof detail.rationale === 'string' ? detail.rationale : '',
    }
    return acc
  }, {} as AxisScores)

  const overall_score = AXIS_KEYS.reduce((sum, k) => sum + axis_scores[k].score, 0)

  const improvements = Array.isArray(j.improvements)
    ? j.improvements.filter((s): s is string => typeof s === 'string').slice(0, 8)
    : []

  return {
    overall_score,
    axis_scores,
    summary: typeof j.summary === 'string' ? j.summary : '',
    improvements,
    safety_notice: typeof j.safety_notice === 'string' && j.safety_notice.trim() ? j.safety_notice : null,
  }
}

function neutralFallback() {
  const axis_scores = AXIS_KEYS.reduce((acc, key) => {
    acc[key] = { score: 10, rationale: '평가 데이터를 파싱할 수 없어 중립 점수를 반환합니다.' }
    return acc
  }, {} as AxisScores)
  return {
    overall_score: 50,
    axis_scores,
    summary: '평가 응답 형식 오류로 분석을 완료할 수 없었습니다.',
    improvements: [],
    safety_notice: null,
  }
}
