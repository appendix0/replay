import { anthropic, EVAL_MODEL, EVAL_MAX_TOKENS } from './anthropic'
import type { EvaluationScores, TokenUsage } from '@/types'

export interface EvaluationResult {
  scores: EvaluationScores
  usage: TokenUsage
}

export interface EvalContext {
  scenario_title: string
  scenario_description: string
  conversation_history: Array<{ role: 'user' | 'assistant'; content: string }>
  user_utterance: string
}

/**
 * Independently evaluates a single user utterance.
 * Runs in a completely separate context from the roleplay agent —
 * it never sees the persona's system prompt.
 */
export async function evaluateUserUtterance(
  ctx: EvalContext,
): Promise<EvaluationResult> {
  const systemPrompt = buildEvalSystemPrompt()
  const userPrompt = buildEvalUserPrompt(ctx)

  const response = await anthropic.messages.create({
    model: EVAL_MODEL,
    max_tokens: EVAL_MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as { type: 'text'; text: string }).text)
    .join('')

  const scores = parseEvalScores(text)

  return {
    scores,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  }
}

function buildEvalSystemPrompt(): string {
  return `당신은 대화 커뮤니케이션 전문 평가자입니다.
사용자의 발화를 3가지 축으로 0-10점 척도로 평가합니다.

평가 기준:
1. appropriateness (내용 적절성): 응답이 상황에 맞는가? 사회적으로 적절한가?
2. coherence (맥락 일관성): 대화 흐름을 잘 유지하는가? 이전 대화 내용을 반영하는가?
3. tone (감정 톤 일관성): 감정적 톤이 상황에 적절한가? 너무 공격적이거나 너무 수동적이지 않은가?

반드시 다음 JSON 형식으로만 응답하세요. 다른 텍스트 없이:
{"appropriateness": 숫자, "coherence": 숫자, "tone": 숫자}`
}

function buildEvalUserPrompt(ctx: EvalContext): string {
  const historyText = ctx.conversation_history
    .map((turn) => `${turn.role === 'user' ? '사용자' : '상대방'}: ${turn.content}`)
    .join('\n')

  return `[시나리오]
제목: ${ctx.scenario_title}
설명: ${ctx.scenario_description}

[대화 기록]
${historyText || '(대화 시작)'}

[평가할 사용자 발화]
"${ctx.user_utterance}"

위 발화를 3가지 축으로 평가하세요.`
}

function parseEvalScores(text: string): EvaluationScores {
  try {
    // Extract JSON from the response (handle any surrounding whitespace)
    const match = text.match(/\{[^}]+\}/)
    if (!match) throw new Error('No JSON found')

    const parsed = JSON.parse(match[0])

    const clamp = (v: unknown) => Math.min(10, Math.max(0, Number(v) || 5))

    return {
      appropriateness: clamp(parsed.appropriateness),
      coherence: clamp(parsed.coherence),
      tone: clamp(parsed.tone),
    }
  } catch {
    // Fallback to neutral scores if parsing fails
    return { appropriateness: 5, coherence: 5, tone: 5 }
  }
}
