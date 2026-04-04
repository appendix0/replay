'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { PersonaAvatar } from '@/components/PersonaAvatar'
import type { FeedbackReport, Scenario, Session } from '@/types'

interface FeedbackData {
  report: FeedbackReport
}

interface SessionData {
  session: Session & { scenarios: Scenario }
  messages: { role: string; content: string }[]
}

const AXIS_LABELS = {
  appropriateness: '내용 적절성',
  coherence: '맥락 일관성',
  tone: '감정 톤',
}

const AXIS_ICONS = {
  appropriateness: '🎯',
  coherence: '🔗',
  tone: '💬',
}

export default function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [feedback, setFeedback] = useState<FeedbackData | null>(null)
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [speakingLine, setSpeakingLine] = useState(0)
  const [isTalking, setIsTalking] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/feedback/${id}`).then((r) => r.json()),
      fetch(`/api/sessions/${id}`).then((r) => r.json()),
    ]).then(([f, s]) => {
      setFeedback(f)
      setSessionData(s)
      setLoading(false)
    })
  }, [id])

  // Auto-cycle the avatar through feedback lines
  useEffect(() => {
    if (!feedback) return

    const lines = feedback.report.improvements
    if (!lines.length) return

    let idx = 0
    const cycle = () => {
      setSpeakingLine(idx)
      setIsTalking(true)
      const duration = 1200 + lines[idx].length * 40
      setTimeout(() => {
        setIsTalking(false)
        idx = (idx + 1) % lines.length
        setTimeout(cycle, 600)
      }, duration)
    }

    const t = setTimeout(cycle, 800)
    return () => clearTimeout(t)
  }, [feedback])

  const persona = sessionData?.session?.scenarios?.persona_config
  const scenario = sessionData?.session?.scenarios
  const report = feedback?.report

  const scoreColor = (score: number) => {
    if (score >= 80) return '#2563eb'
    if (score >= 60) return '#3b82f6'
    if (score >= 40) return '#f59e0b'
    return '#ef4444'
  }

  const axisAvg = (axis: 'appropriateness' | 'coherence' | 'tone') =>
    report?.axis_scores?.[axis]?.avg ?? 0

  return (
    <main className="min-h-screen bg-[#f0f7ff] max-w-lg mx-auto">
      {/* Header */}
      <header className="bg-white border-b border-blue-100 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button
          onClick={() => router.push('/')}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-50"
        >
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="font-bold text-blue-900 text-base flex-1">피드백 리포트</h1>
        <span className="text-xs text-blue-400">{scenario?.title}</span>
      </header>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="px-4 py-6 space-y-5 pb-12">

          {/* Avatar + Overall Score Hero */}
          <div className="bg-white rounded-3xl border border-blue-100 shadow-sm overflow-hidden">
            {/* Blue gradient top */}
            <div
              className="px-6 pt-8 pb-16 text-center relative"
              style={{
                background: 'linear-gradient(160deg, #1e40af 0%, #3b82f6 100%)',
              }}
            >
              <p className="text-blue-200 text-sm font-medium mb-6">세션 결과</p>

              {/* Overall Score Ring */}
              <div className="relative w-28 h-28 mx-auto">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="white"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - (report?.overall_score ?? 0) / 100)}`}
                    style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-white">{report?.overall_score ?? 0}</span>
                  <span className="text-xs text-blue-200 font-medium">/ 100</span>
                </div>
              </div>
            </div>

            {/* Avatar overlapping the gradient */}
            <div className="relative -mt-12 flex justify-center">
              {persona && (
                <div className="relative">
                  <div
                    className="rounded-full border-4 border-white shadow-lg"
                    style={{ background: '#eff6ff' }}
                  >
                    <PersonaAvatar
                      name={persona.name}
                      size="xl"
                      isTalking={isTalking}
                      animate={false}
                      aggression={persona.aggression}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Speech bubble from avatar */}
            {report && report.improvements.length > 0 && (
              <div className="mx-5 mt-4 mb-5">
                <div
                  className="relative bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 text-sm text-blue-800 leading-relaxed min-h-[60px] transition-all duration-300"
                >
                  {/* Bubble tail */}
                  <div
                    className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-2 overflow-hidden"
                  >
                    <div className="w-4 h-4 bg-blue-200 rotate-45 -translate-y-2 translate-x-0" />
                  </div>
                  <p className="italic">&ldquo;{report.improvements[speakingLine]}&rdquo;</p>
                  {/* Talking dots */}
                  {isTalking && (
                    <span className="inline-flex gap-0.5 ml-1 items-center">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1 h-1 bg-blue-400 rounded-full inline-block"
                          style={{
                            animation: `wave 0.8s ease-in-out infinite`,
                            animationDelay: `${i * 0.15}s`,
                          }}
                        />
                      ))}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Axis Score Cards */}
          <div className="grid grid-cols-3 gap-2">
            {(['appropriateness', 'coherence', 'tone'] as const).map((axis) => {
              const avg = axisAvg(axis)
              return (
                <div
                  key={axis}
                  className="bg-white rounded-2xl border border-blue-100 p-3 text-center shadow-sm"
                >
                  <div className="text-xl mb-1">{AXIS_ICONS[axis]}</div>
                  <div className="text-xs text-blue-500 mb-2 leading-tight">
                    {AXIS_LABELS[axis]}
                  </div>
                  {/* Mini arc */}
                  <svg className="w-12 h-8 mx-auto" viewBox="0 0 48 28">
                    <path
                      d="M 4 24 A 20 20 0 0 1 44 24"
                      fill="none"
                      stroke="#dbeafe"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 4 24 A 20 20 0 0 1 44 24"
                      fill="none"
                      stroke={scoreColor(avg * 10)}
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={`${Math.PI * 20}`}
                      strokeDashoffset={`${Math.PI * 20 * (1 - avg / 10)}`}
                    />
                  </svg>
                  <p
                    className="text-lg font-black mt-1"
                    style={{ color: scoreColor(avg * 10) }}
                  >
                    {avg.toFixed(1)}
                  </p>
                  <p className="text-xs text-blue-300">/ 10</p>
                </div>
              )
            })}
          </div>

          {/* Analysis */}
          {report?.raw_analysis && (
            <div className="bg-white rounded-2xl border border-blue-100 p-4 shadow-sm">
              <h3 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                <span>📋</span> 종합 분석
              </h3>
              <p className="text-sm text-blue-700 leading-relaxed">{report.raw_analysis}</p>
            </div>
          )}

          {/* Examples from conversation */}
          {report && (
            <div className="bg-white rounded-2xl border border-blue-100 p-4 shadow-sm">
              <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                <span>✨</span> 개선 포인트
              </h3>
              <div className="space-y-2">
                {report.improvements.map((tip, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                      {i + 1}
                    </div>
                    <p className="text-sm text-blue-700 leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Axis examples */}
          {report && (
            <div className="bg-white rounded-2xl border border-blue-100 p-4 shadow-sm">
              <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                <span>💡</span> 발화 예시
              </h3>
              {(['appropriateness', 'coherence', 'tone'] as const).map((axis) => {
                const examples = report.axis_scores?.[axis]?.examples ?? []
                if (!examples.length) return null
                return (
                  <div key={axis} className="mb-3 last:mb-0">
                    <p className="text-xs font-semibold text-blue-500 mb-1.5">
                      {AXIS_ICONS[axis]} {AXIS_LABELS[axis]}
                    </p>
                    {examples.map((ex, i) => (
                      <div
                        key={i}
                        className="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2 mb-1"
                      >
                        {ex}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={() => router.push('/')}
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl
                       hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 text-base"
          >
            다시 연습하기 →
          </button>
        </div>
      )}
    </main>
  )
}

function LoadingSkeleton() {
  return (
    <div className="px-4 py-6 space-y-5 animate-pulse">
      <div className="h-64 bg-white rounded-3xl border border-blue-100" />
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-white rounded-2xl border border-blue-100" />)}
      </div>
      <div className="h-32 bg-white rounded-2xl border border-blue-100" />
      <div className="h-40 bg-white rounded-2xl border border-blue-100" />
    </div>
  )
}
