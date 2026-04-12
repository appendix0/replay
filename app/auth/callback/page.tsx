'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

// Supabase sends ?code=xxx after magic link click (PKCE flow).
// This page exchanges the code for a session, upserts the user
// record, then redirects home.
export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    const code = new URLSearchParams(window.location.search).get('code')

    if (!code) {
      setError('유효하지 않은 링크입니다.')
      return
    }

    supabase.auth.exchangeCodeForSession(code)
      .then(async ({ data, error: authError }) => {
        if (authError || !data.session) {
          setError(authError?.message ?? '인증에 실패했습니다.')
          return
        }

        // Upsert user record in public.users table (creates on first login)
        const { user } = data.session
        await supabase
          .from('users')
          .upsert(
            { id: user.id, email: user.email! },
            { onConflict: 'id', ignoreDuplicates: true },
          )

        router.replace('/')
      })
  }, [router])

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f0f7ff]">
        <div className="text-center p-6">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm"
          >
            로그인으로 돌아가기
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f0f7ff]">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-blue-500">로그인 중...</p>
      </div>
    </main>
  )
}
