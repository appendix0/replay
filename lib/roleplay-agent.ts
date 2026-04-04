import { anthropic, ROLEPLAY_MODEL, ROLEPLAY_MAX_TOKENS } from './anthropic'
import type { PersonaConfig, TokenUsage } from '@/types'

export interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface RoleplayResult {
  response: string
  usage: TokenUsage
}

/**
 * Generates the next character response given conversation history.
 * Each call is fully self-contained — the full history is passed every time.
 */
export async function generateRoleplayResponse(
  persona: PersonaConfig,
  history: ConversationTurn[],
): Promise<RoleplayResult> {
  const systemPrompt = buildRoleplaySystemPrompt(persona)

  const messages = history.map((turn) => ({
    role: turn.role as 'user' | 'assistant',
    content: turn.content,
  }))

  const response = await anthropic.messages.create({
    model: ROLEPLAY_MODEL,
    max_tokens: ROLEPLAY_MAX_TOKENS,
    system: systemPrompt,
    messages,
  })

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as { type: 'text'; text: string }).text)
    .join('')

  return {
    response: text,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  }
}

function buildRoleplaySystemPrompt(persona: PersonaConfig): string {
  const aggressionDesc = persona.aggression > 0.6 ? '매우 공격적' : persona.aggression > 0.3 ? '다소 직설적' : '온화한'
  const patienceDesc = persona.patience < 0.3 ? '매우 성급한' : persona.patience < 0.6 ? '보통의 인내심을 가진' : '인내심 있는'

  return `${persona.system_prompt}

[캐릭터 설정]
- 이름: ${persona.name}
- 성격: ${persona.personality}
- 상황: ${persona.scenario}
- 공격성 수준: ${aggressionDesc} (${persona.aggression}/1.0)
- 인내심: ${patienceDesc} (${persona.patience}/1.0)
- 감정 변동성: ${persona.volatility}/1.0

[대화 지침]
- 위 캐릭터로서 자연스럽게 대화하세요.
- 응답은 2-4문장 내로 간결하게 유지하세요.
- 과도하게 긴 설명이나 설교는 피하세요.
- 캐릭터의 성격과 감정 상태를 일관되게 유지하세요.
- 한국어로만 응답하세요.`
}
