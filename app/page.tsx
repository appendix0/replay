'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
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

interface SessionSummary {
  id: string
  status: 'active' | 'completed' | 'abandoned'
  overall_score: number | null
  started_at: string
  ended_at: string | null
  scenarios: { title: string; difficulty: string } | null
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diffDays === 0) return '오늘'
  if (diffDays === 1) return '어제'
  if (diffDays < 7) return `${diffDays}일 전`
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

function scoreColor(score: number) {
  if (score >= 80) return '#2563eb'
  if (score >= 60) return '#3b82f6'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

function ScoreRing({ score }: { score: number }) {
  const r = 14
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - score / 100)
  return (
    <div className="relative w-10 h-10 flex-shrink-0">
      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#dbeafe" strokeWidth="4" />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke={scoreColor(score)}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[10px] font-black"
        style={{ color: scoreColor(score) }}
      >
        {score}
      </span>
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [tab, setTab] = useState<'scenarios' | 'history'>('scenarios')
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loadingScenarios, setLoadingScenarios] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [starting, setStarting] = useState<string | null>(null)
  const [startError, setStartError] = useState<string | null>(null)

  // Auth gate
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return
    fetch('/api/scenarios')
      .then((r) => r.json())
      .then((d) => setScenarios(d.scenarios ?? []))
      .finally(() => setLoadingScenarios(false))
  }, [user])

  // Load history lazily on first tab switch
  useEffect(() => {
    if (tab !== 'history' || historyLoaded || !user) return
    setLoadingHistory(true)
    fetch(`/api/sessions?user_id=${user.id}`)
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions ?? []))
      .finally(() => {
        setLoadingHistory(false)
        setHistoryLoaded(true)
      })
  }, [tab, historyLoaded, user])

  async function startSession(scenarioId: string) {
    if (!user) return
    setStarting(scenarioId)
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_id: scenarioId, user_id: user.id }),
      })
      if (!res.ok) {
        const text = await res.text()
        setStartError(`${res.status}: ${text}`)
        setStarting(null)
        return
      }
      const data = await res.json()
      router.push(`/session/${data.session.id}`)
    } catch (err) {
      setStartError(err instanceof Error ? err.message : 'Unknown error')
      setStarting(null)
    }
  }

  async function handleLogout() {
    await getSupabaseBrowserClient().auth.signOut()
    router.replace('/login')
  }

  if (authLoading || !user) return null

  const completedSessions = sessions.filter((s) => s.status === 'completed')
  const avgScore =
    completedSessions.length > 0
      ? Math.round(
          completedSessions.reduce((sum, s) => sum + (s.overall_score ?? 0), 0) /
            completedSessions.length,
        )
      : null

  return (
    <main className="min-h-screen flex flex-col bg-[#f0f7ff]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-blue-100 px-5 py-4 flex items-center gap-3 shadow-sm">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-bold">R</span>
        </div>
        <div className="flex-1">
          <h1 className="text-base font-bold text-blue-900 leading-none">RE:PLAY</h1>
          <p className="text-xs text-blue-400 mt-0.5">대화 훈련 시뮬레이터</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-blue-400 truncate max-w-[120px]">{user.email}</span>
          <button
            onClick={handleLogout}
            className="text-xs text-blue-300 hover:text-blue-600 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-blue-100 px-5 flex gap-1">
        {[
          { key: 'scenarios', label: '시나리오' },
          { key: 'history', label: '내 기록' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key as 'scenarios' | 'history')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-blue-300 hover:text-blue-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 px-5 py-6 max-w-lg mx-auto w-full">

        {/* ── SCENARIOS TAB ── */}
        {tab === 'scenarios' && (
          <>
            <div className="mb-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                <span className="text-4xl">🎭</span>
              </div>
              <h2 className="text-xl font-bold text-blue-900">시나리오를 선택하세요</h2>
              <p className="text-sm text-blue-400 mt-1">
                실전 대화를 연습하고 AI 코치에게 피드백을 받아보세요
              </p>
            </div>

            {startError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 break-all">
                {startError}
              </div>
            )}

            {loadingScenarios ? (
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

            <div className="mt-8 p-4 rounded-xl bg-white border border-blue-100 flex gap-3 items-start">
              <span className="text-xl mt-0.5">🎙️</span>
              <div>
                <p className="text-xs font-semibold text-blue-700">음성 입력 지원</p>
                <p className="text-xs text-blue-400 mt-0.5">
                  마이크 버튼을 눌러 말하거나 직접 입력하세요
                </p>
              </div>
            </div>
          </>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === 'history' && (
          <>
            {/* Stats bar — only shown when there are completed sessions */}
            {completedSessions.length > 0 && (
              <div className="mb-5 grid grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl border border-blue-100 p-4 text-center shadow-sm">
                  <p className="text-3xl font-black text-blue-600">{completedSessions.length}</p>
                  <p className="text-xs text-blue-400 mt-1">완료한 세션</p>
                </div>
                <div className="bg-white rounded-2xl border border-blue-100 p-4 text-center shadow-sm">
                  <p
                    className="text-3xl font-black"
                    style={{ color: avgScore !== null ? scoreColor(avgScore) : '#93c5fd' }}
                  >
                    {avgScore ?? '—'}
                  </p>
                  <p className="text-xs text-blue-400 mt-1">평균 점수</p>
                </div>
              </div>
            )}

            {loadingHistory ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-2xl bg-blue-50 animate-pulse" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4 text-3xl">
                  📭
                </div>
                <p className="font-bold text-blue-700 text-base">아직 기록이 없어요</p>
                <p className="text-sm text-blue-400 mt-1">시나리오를 선택해 첫 대화를 시작하세요</p>
                <button
                  onClick={() => setTab('scenarios')}
                  className="mt-5 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-full hover:bg-blue-700 transition-colors"
                >
                  시나리오 보기
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => {
                  const isCompleted = session.status === 'completed'
                  const isActive = session.status === 'active'
                  return (
                    <button
                      key={session.id}
                      onClick={() =>
                        router.push(
                          isCompleted
                            ? `/session/${session.id}/feedback`
                            : `/session/${session.id}`,
                        )
                      }
                      className="w-full text-left bg-white rounded-2xl border border-blue-100 p-4
                                 shadow-sm hover:shadow-md hover:border-blue-300 hover:bg-blue-50
                                 transition-all duration-200 active:scale-[0.98] flex items-center gap-4"
                    >
                      {/* Score ring or status icon */}
                      {isCompleted && session.overall_score !== null ? (
                        <ScoreRing score={session.overall_score} />
                      ) : (
                        <div className="w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center text-xl bg-blue-50">
                          {isActive ? '▶️' : '—'}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-blue-900 text-sm truncate">
                          {session.scenarios?.title ?? '알 수 없는 시나리오'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {session.scenarios?.difficulty && (
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${DIFFICULTY_COLOR[session.scenarios.difficulty]}`}
                            >
                              {DIFFICULTY_LABEL[session.scenarios.difficulty]}
                            </span>
                          )}
                          <span className="text-xs text-blue-400">{formatDate(session.started_at)}</span>
                          {isActive && (
                            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                              진행 중
                            </span>
                          )}
                        </div>
                      </div>

                      <svg className="w-4 h-4 text-blue-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
