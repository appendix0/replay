'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Already logged in → go home
  useEffect(() => {
    if (!loading && user) router.replace('/')
  }, [user, loading, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return

    setSubmitting(true)
    setError(null)

    const supabase = getSupabaseBrowserClient()
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (authError) {
      setError(authError.message)
      setSubmitting(false)
    } else {
      setSent(true)
      setSubmitting(false)
    }
  }

  if (loading) return null

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#f0f7ff] px-5">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <span className="text-3xl">🎭</span>
          </div>
          <h1 className="text-2xl font-black text-blue-900">RE:PLAY</h1>
          <p className="text-sm text-blue-400 mt-1">대화 훈련 시뮬레이터</p>
        </div>

        {sent ? (
          <div className="bg-white rounded-3xl border border-blue-100 p-8 shadow-sm text-center">
            <div className="text-4xl mb-4">📬</div>
            <h2 className="text-lg font-bold text-blue-900 mb-2">이메일을 확인하세요</h2>
            <p className="text-sm text-blue-500 leading-relaxed">
              <span className="font-semibold text-blue-700">{email}</span> 으로<br />
              로그인 링크를 보냈습니다.<br />
              링크를 클릭하면 바로 시작할 수 있어요.
            </p>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              className="mt-6 text-xs text-blue-400 hover:text-blue-600 underline underline-offset-2"
            >
              다른 이메일로 시도
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-blue-100 p-8 shadow-sm">
            <h2 className="text-lg font-bold text-blue-900 mb-1">시작하기</h2>
            <p className="text-sm text-blue-400 mb-6">
              이메일 주소를 입력하면 로그인 링크를 보내드려요. 비밀번호 없이 바로 시작!
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="이메일 주소"
                  required
                  autoFocus
                  className="w-full rounded-2xl border border-blue-200 bg-blue-50
                             px-4 py-3 text-sm text-blue-900 placeholder:text-blue-300
                             focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
                />
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting || !email.trim()}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-2xl
                           hover:bg-blue-700 transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-blue-200"
              >
                {submitting ? '전송 중...' : '링크 받기'}
              </button>
            </form>

            <p className="text-xs text-blue-300 text-center mt-6">
              가입 없이 이메일만으로 시작 · 무료 3회 세션
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
