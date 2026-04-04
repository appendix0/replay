import { anthropic, EVAL_MODEL } from './anthropic'
import type { Message, Scenario, AxisScores, TokenUsage } from '@/types'

export interface FeedbackResult {
  overall_score: number
  axis_scores: AxisScores
  improvements: string[]
  raw_analysis: string
  usage: TokenUsage
}

/**
 * Analyzes the full session and generates a structured feedback report.
 * Called once at session end.
 */
export async function generateFeedbackReport(
  scenario: Scenario,
  messages: Message[],
): Promise<FeedbackResult> {
  const userMessages = messages.filter((m) => m.role === 'user' && m.appropriateness_score !== null)

  // Compute per-axis averages from stored per-turn scores
  const axisScores = computeAxisScores(userMessages, messages)

  // Overall score: weighted average (equal weight for MVP)
  const overall_score = Math.round(
    ((axisScores.appropriateness.avg + axisScores.coherence.avg + axisScores.tone.avg) / 3) * 10,
  )

  // Ask LLM for qualitative analysis and improvement suggestions
  const { analysis, improvements, usage } = await getQualitativeAnalysis(scenario, messages)

  return {
    overall_score,
    axis_scores: axisScores,
    improvements,
    raw_analysis: analysis,
    usage,
  }
}

function computeAxisScores(userMessages: Message[], allMessages: Message[]): AxisScores {
  const safeAvg = (values: (number | null)[]) => {
    const valid = values.filter((v): v is number => v !== null)
    return valid.length ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10 : 0
  }

  // Find notable examples (best and worst turns)
  const getExamples = (axis: 'appropriateness_score' | 'coherence_score' | 'tone_score'): string[] => {
    const scored = userMessages
      .filter((m) => m[axis] !== null)
      .sort((a, b) => (b[axis] as number) - (a[axis] as number))

    const examples: string[] = []
    if (scored[0]) examples.push(`"${scored[0].content.slice(0, 60)}..." (${scored[0][axis]}/10)`)
    const worst = scored[scored.length - 1]
    if (worst && worst.id !== scored[0]?.id) {
      examples.push(`"${worst.content.slice(0, 60)}..." (${worst[axis]}/10)`)
    }
    return examples
  }

  return {
    appropriateness: {
      avg: safeAvg(userMessages.map((m) => m.appropriateness_score)),
      examples: getExamples('appropriateness_score'),
    },
    coherence: {
      avg: safeAvg(userMessages.map((m) => m.coherence_score)),
      examples: getExamples('coherence_score'),
    },
    tone: {
      avg: safeAvg(userMessages.map((m) => m.tone_score)),
      examples: getExamples('tone_score'),
    },
  }
}

async function getQualitativeAnalysis(
  scenario: Scenario,
  messages: Message[],
): Promise<{ analysis: string; improvements: string[]; usage: TokenUsage }> {
  const conversationText = messages
    .map((m) => {
      const prefix = m.role === 'user' ? '사용자' : scenario.persona_config.name
      const scores =
        m.role === 'user' && m.appropriateness_score !== null
          ? ` [적절성:${m.appropriateness_score}, 일관성:${m.coherence_score}, 톤:${m.tone_score}]`
          : ''
      return `${prefix}: ${m.content}${scores}`
    })
    .join('\n')

  const prompt = `당신은 커뮤니케이션 코치입니다. 다음 대화 세션을 분석하고 개선점을 제시하세요.

[시나리오]
${scenario.title} — ${scenario.description}

[대화 기록 (점수 포함)]
${conversationText}

다음 JSON 형식으로만 응답하세요:
{
  "analysis": "전반적인 대화 분석 (2-3문장)",
  "improvements": ["개선점 1", "개선점 2", "개선점 3"]
}`

  const response = await anthropic.messages.create({
    model: EVAL_MODEL,
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')

  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON')
    const parsed = JSON.parse(match[0])
    return {
      analysis: parsed.analysis ?? text,
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 3) : [],
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    }
  } catch {
    return {
      analysis: text,
      improvements: ['대화를 더 구체적으로 이어가세요.', '감정 조절에 신경 쓰세요.', '상대방의 말을 경청하세요.'],
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    }
  }
}
