import { db } from '@/lib/db'
import type { Scenario } from '@/types'

const FALLBACK_SCENARIOS: Scenario[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    title: '거절 연습',
    description: '동료의 무리한 부탁을 정중하게 거절하는 연습입니다.',
    difficulty: 'beginner',
    persona_config: {
      name: '박 대리',
      personality: '친근하지만 부탁이 많은 동료',
      scenario: '야근이 많은 시기에 자신의 업무를 대신 해달라고 부탁하는 상황',
      aggression: 0.2,
      volatility: 0.3,
      patience: 0.7,
      language: 'ko',
      system_prompt: '',
      avatar_id: undefined,
      tts_voice_id: 'pNInz6obpgDQGcFmaJgB',
    },
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    title: '갈등 대응',
    description: '공격적인 상사에게 감정적으로 대응하지 않고 상황을 관리하는 연습입니다.',
    difficulty: 'intermediate',
    persona_config: {
      name: '김 팀장',
      personality: '엄격하고 성급한 팀장',
      scenario: '바쁜 시기에 직원이 휴가를 요청하는 상황',
      aggression: 0.7,
      volatility: 0.5,
      patience: 0.2,
      language: 'ko',
      system_prompt: '',
      avatar_id: undefined,
      tts_voice_id: 'VR6AewLTigWG4xSOukaG',
    },
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    title: '연봉 협상',
    description: 'HR 담당자와 연봉 협상을 성공적으로 이끄는 연습입니다.',
    difficulty: 'advanced',
    persona_config: {
      name: '이 과장',
      personality: '전략적이고 예산을 중시하는 HR 담당자',
      scenario: '연봉 인상을 요청하는 면담 상황',
      aggression: 0.3,
      volatility: 0.2,
      patience: 0.6,
      language: 'ko',
      system_prompt: '',
      avatar_id: undefined,
      tts_voice_id: '21m00Tcm4TlvDq8ikWAM',
    },
    created_at: new Date().toISOString(),
  },
]

export async function GET() {
  try {
    const { data, error } = await db
      .from('scenarios')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) throw error

    return Response.json({ scenarios: data as Scenario[] })
  } catch {
    return Response.json({ scenarios: FALLBACK_SCENARIOS })
  }
}
