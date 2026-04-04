'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Scenario } from '@/types'

const DIFFICULTY_LABEL: Record<string, string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
}

const DIFFICULTY_COLOR: Record<string, string> = {
  beginner: 'bg-blue-100 text-blue-600',
  intermediate: 'bg-blue-200 text-blue-700',
  advanced: 'bg-blue-700 text-white',
}

const SCENARIO_ICONS = ['🙅', '💼', '🤝']

export default function HomePage() {
  const router = useRouter()
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/scenarios')
      .then((r) => r.json())
      .then((d) => setScenarios(d.scenarios ?? []))
      .finally(() => setLoading(false))
  }, [])

  async function startSession(scenarioId: string) {
    setStarting(scenarioId)
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_id: scenarioId }),
      })
      const data = await res.json()
      router.push(`/session/${data.session.id}`)
    } catch {
      setStarting(null)
    }
  }

  return (
    <main className="min-h-screen flex flex-col bg-[#f0f7ff]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-blue-100 px-5 py-4 flex items-center gap-3 shadow-sm">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
          <span className="text-white text-sm font-bold">R</span>
        </div>
        <div>
          <h1 className="text-base font-bold text-blue-900 leading-none">RE:PLAY</h1>
          <p className="text-xs text-blue-400 mt-0.5">대화 훈련 시뮬레이터</p>
        </div>
      </header>

      <div className="flex-1 px-5 py-6 max-w-lg mx-auto w-full">
        {/* Hero */}
        <div className="mb-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <span className="text-4xl">🎭</span>
          </div>
          <h2 className="text-xl font-bold text-blue-900">시나리오를 선택하세요</h2>
          <p className="text-sm text-blue-400 mt-1">
            실전 대화를 연습하고 AI 코치에게 피드백을 받아보세요
          </p>
        </div>

        {/* Scenario Cards */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-blue-50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {scenarios.map((scenario, idx) => (
              <button
                key={scenario.id}
                onClick={() => startSession(scenario.id)}
                disabled={starting !== null}
                className="w-full text-left rounded-2xl bg-white border border-blue-100 p-5
                           shadow-sm hover:shadow-md hover:border-blue-300 hover:bg-blue-50
                           transition-all duration-200 active:scale-[0.98] disabled:opacity-60
                           disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 text-2xl">
                    {SCENARIO_ICONS[idx] ?? '💬'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-blue-900 text-base">{scenario.title}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${DIFFICULTY_COLOR[scenario.difficulty]}`}
                      >
                        {DIFFICULTY_LABEL[scenario.difficulty]}
                      </span>
                    </div>
                    <p className="text-sm text-blue-500 leading-relaxed">{scenario.description}</p>
                    <div className="mt-2 text-xs text-blue-400">
                      상대방:{' '}
                      <span className="font-medium text-blue-600">
                        {scenario.persona_config.name}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 self-center">
                    {starting === scenario.id ? (
                      <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                    ) : (
                      <svg className="w-5 h-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Footer tip */}
        <div className="mt-8 p-4 rounded-xl bg-white border border-blue-100 flex gap-3 items-start">
          <span className="text-xl mt-0.5">🎙️</span>
          <div>
            <p className="text-xs font-semibold text-blue-700">음성 입력 지원</p>
            <p className="text-xs text-blue-400 mt-0.5">
              마이크 버튼을 눌러 말하거나 직접 입력하세요
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
