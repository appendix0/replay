'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type AxisKey = 'appropriateness' | 'coherence' | 'tone' | 'formality' | 'empathy'

const AXIS_KEYS: AxisKey[] = ['appropriateness', 'coherence', 'tone', 'formality', 'empathy']

const AXIS_LABELS: Record<AxisKey, string> = {
  appropriateness: '적절성',
  coherence: '일관성',
  tone: '어조',
  formality: '격식',
  empathy: '공감',
}

const AXIS_ICONS: Record<AxisKey, string> = {
  appropriateness: '🎯',
  coherence: '🧩',
  tone: '🎵',
  formality: '🎩',
  empathy: '❤️',
}

const SCORES: Record<AxisKey, { score: number; rationale: string }> = {
  appropriateness: {
    score: 17,
    rationale: '상황에 맞게 정중히 거절하는 표현을 선택했고, 감사 인사로 대화를 마무리한 점이 인상적이었습니다.',
  },
  coherence: {
    score: 18,
    rationale: '대화 흐름이 자연스러웠고, 본인의 입장을 처음부터 끝까지 일관되게 유지했습니다.',
  },
  tone: {
    score: 15,
    rationale: '대체로 차분했지만, 후반부에 어조가 약간 단호해지면서 거리감이 생겼습니다.',
  },
  formality: {
    score: 16,
    rationale: '직장 동료와의 관계에 적절한 존댓말과 어휘를 사용했습니다.',
  },
  empathy: {
    score: 14,
    rationale: '상대방의 어려움을 인정하는 표현이 한두 차례 더 있었다면 더 좋았을 것입니다.',
  },
}

const TOTAL = Object.values(SCORES).reduce((s, a) => s + a.score, 0)

const SUMMARY =
  '동료의 무리한 부탁을 정중하게 거절하는 데 성공했습니다. 본인의 입장을 명확히 전달하면서도 관계를 해치지 않는 균형 감각이 돋보였습니다. 다만 상대방의 상황에 공감하는 표현을 조금만 더 추가했더라면 한층 부드러운 대화가 되었을 것입니다.'

const IMPROVEMENTS = [
  '거절하기 전에 상대방의 상황을 한 번 더 인정해 주세요. 예: "정말 바쁘신 것 같아요."',
  '대안을 함께 제시하면 거절이 부드러워집니다. 예: "다음 주에는 도와드릴 수 있어요."',
  '거절 이유를 길게 설명할수록 변명처럼 들립니다. 짧고 분명하게 전달하세요.',
]

function scoreColor(score: number) {
  if (score >= 80) return '#003876'
  if (score >= 60) return '#3a4c6e'
  if (score >= 40) return '#a16207'
  return '#b91c1c'
}

export default function DemoFeedbackPage() {
  const router = useRouter()
  const [speakingLine, setSpeakingLine] = useState(0)
  const [isTalking, setIsTalking] = useState(false)

  useEffect(() => {
    let idx = 0
    let cancelled = false
    const cycle = () => {
      if (cancelled) return
      setSpeakingLine(idx)
      setIsTalking(true)
      const duration = 1400 + IMPROVEMENTS[idx].length * 40
      setTimeout(() => {
        if (cancelled) return
        setIsTalking(false)
        idx = (idx + 1) % IMPROVEMENTS.length
        setTimeout(cycle, 700)
      }, duration)
    }
    const t = setTimeout(cycle, 800)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [])

  return (
    <main className="min-h-screen bg-[#eef1f7] max-w-lg mx-auto">
      {/* Header */}
      <header className="bg-white border-b border-blue-100 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button
          onClick={() => router.push('/')}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-50"
        >
          <svg className="w-5 h-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="font-bold text-blue-900 text-base flex-1">피드백 리포트</h1>
        <span className="text-xs text-blue-400">거절 연습</span>
      </header>

      <div className="px-4 py-6 space-y-5 pb-12">

        {/* Hero — overall score */}
        <div className="bg-white rounded-3xl border border-blue-100 shadow-sm overflow-hidden">
          <div
            className="px-6 pt-8 pb-16 text-center relative"
            style={{
              background: 'linear-gradient(160deg, #00205b 0%, #003876 60%, #1a3361 100%)',
            }}
          >
            <p className="text-blue-200 text-sm font-medium mb-6">세션 결과</p>

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
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - TOTAL / 100)}`}
                  style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-white">{TOTAL}</span>
                <span className="text-xs text-blue-200 font-medium">/ 100</span>
              </div>
            </div>
          </div>

          {/* Avatar circle */}
          <div className="relative -mt-12 flex justify-center">
            <div
              className="w-24 h-24 rounded-full border-4 border-white shadow-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #d6dde9 0%, #aebcd1 100%)' }}
            >
              <span className="text-4xl">🧑‍💼</span>
            </div>
          </div>
          <p className="text-center text-xs text-blue-500 mt-2 font-medium">박 대리</p>

          {/* Speech bubble */}
          <div className="mx-5 mt-4 mb-5">
            <div className="relative bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 text-sm text-blue-800 leading-relaxed min-h-[64px] transition-all duration-300">
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-2 overflow-hidden">
                <div className="w-4 h-4 bg-blue-200 rotate-45 -translate-y-2" />
              </div>
              <p className="italic">&ldquo;{IMPROVEMENTS[speakingLine]}&rdquo;</p>
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
        </div>

        {/* 5-axis grid */}
        <div className="grid grid-cols-5 gap-1.5">
          {AXIS_KEYS.map((axis) => {
            const { score } = SCORES[axis]
            return (
              <div
                key={axis}
                className="bg-white rounded-2xl border border-blue-100 p-2 text-center shadow-sm"
              >
                <div className="text-lg mb-0.5">{AXIS_ICONS[axis]}</div>
                <div className="text-[10px] text-blue-500 mb-1.5 leading-tight min-h-[24px] flex items-center justify-center font-semibold">
                  {AXIS_LABELS[axis]}
                </div>
                <svg className="w-10 h-7 mx-auto" viewBox="0 0 48 28">
                  <path
                    d="M 4 24 A 20 20 0 0 1 44 24"
                    fill="none"
                    stroke="#d6dde9"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 4 24 A 20 20 0 0 1 44 24"
                    fill="none"
                    stroke={scoreColor(score * 5)}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={`${Math.PI * 20}`}
                    strokeDashoffset={`${Math.PI * 20 * (1 - score / 20)}`}
                  />
                </svg>
                <p className="text-base font-black mt-0.5" style={{ color: scoreColor(score * 5) }}>
                  {score}
                </p>
                <p className="text-[10px] text-blue-300">/ 20</p>
              </div>
            )
          })}
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl border border-blue-100 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
            <span>📋</span> 총평
          </h3>
          <p className="text-sm text-blue-700 leading-relaxed">{SUMMARY}</p>
        </div>

        {/* Improvements */}
        <div className="bg-white rounded-2xl border border-blue-100 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
            <span>✨</span> 개선 포인트
          </h3>
          <div className="space-y-2.5">
            {IMPROVEMENTS.map((tip, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-blue-700 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                  {i + 1}
                </div>
                <p className="text-sm text-blue-700 leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Per-axis rationale */}
        <div className="bg-white rounded-2xl border border-blue-100 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
            <span>🔍</span> 항목별 근거
          </h3>
          <div className="space-y-3">
            {AXIS_KEYS.map((axis) => {
              const { score, rationale } = SCORES[axis]
              return (
                <div key={axis} className="border-l-2 border-blue-200 pl-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                      {AXIS_ICONS[axis]} {AXIS_LABELS[axis]}
                    </p>
                    <span className="text-xs font-black" style={{ color: scoreColor(score * 5) }}>
                      {score}/20
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 leading-relaxed">{rationale}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => router.push('/')}
          className="w-full py-4 bg-blue-700 text-white font-bold rounded-2xl hover:bg-blue-800 transition-colors shadow-md text-base"
        >
          다시 연습하기 →
        </button>

        {/* AI partners footer */}
        <div className="mt-6 pt-5 border-t border-blue-100/70">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 text-center mb-3">
            Powered by
          </p>
          <div className="flex items-center justify-center gap-2 mb-3 opacity-80">
            <span className="px-3 py-1 rounded-md border border-slate-300 text-slate-600 text-xs font-black tracking-tight">
              LG
            </span>
            <span className="px-3 py-1 rounded-md border border-slate-300 text-slate-600 text-xs font-black tracking-tight">
              KT
            </span>
            <span className="px-3 py-1 rounded-md border border-slate-300 text-slate-600 text-xs font-black tracking-tight">
              NC
            </span>
            <span className="px-3 py-1 rounded-md border border-slate-300 text-slate-600 text-xs font-black tracking-tight lowercase">
              upstage
            </span>
          </div>
          <p className="text-[11px] text-slate-500/90 text-center leading-relaxed">
            이 프로젝트는 LG, KT, NC, Upstage의
            <br />
            독자 AI 모델로 만들어졌습니다.
          </p>
        </div>
      </div>
    </main>
  )
}
