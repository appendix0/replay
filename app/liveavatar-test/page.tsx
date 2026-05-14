'use client'

import { useEffect, useRef, useState } from 'react'
import {
  LiveAvatarSession,
  SessionEvent,
  SessionState,
  AgentEventsEnum,
} from '@heygen/liveavatar-web-sdk'

const WAYNE_AVATAR_ID = 'dd73ea75-1218-4ef3-92ce-606d5f7fbc0a'
const LIVEAVATAR_API_URL = 'https://api.liveavatar.com'

export default function LiveAvatarTestPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const sessionRef = useRef<LiveAvatarSession | null>(null)

  const [voiceId, setVoiceId] = useState('')
  const [text, setText] = useState('안녕하세요. 저는 웨인입니다. 만나서 반갑습니다.')
  const [state, setState] = useState<SessionState>(SessionState.INACTIVE)
  const [streamReady, setStreamReady] = useState(false)
  const [avatarTalking, setAvatarTalking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    return () => {
      sessionRef.current?.stop().catch(() => {})
    }
  }, [])

  async function startSession() {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/liveavatar/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_id: WAYNE_AVATAR_ID }),
      })
      if (!res.ok) throw new Error(await res.text())
      const { session_token } = (await res.json()) as { session_token: string }

      const session = new LiveAvatarSession(session_token, {
        voiceChat: false,
        apiUrl: LIVEAVATAR_API_URL,
      })
      sessionRef.current = session

      session.on(SessionEvent.SESSION_STATE_CHANGED, setState)
      session.on(SessionEvent.SESSION_STREAM_READY, () => setStreamReady(true))
      session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => setAvatarTalking(true))
      session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => setAvatarTalking(false))

      await session.start()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  // Attach the video element once the stream is ready
  useEffect(() => {
    if (streamReady && videoRef.current && sessionRef.current) {
      sessionRef.current.attach(videoRef.current)
    }
  }, [streamReady])

  async function stopSession() {
    setBusy(true)
    try {
      await sessionRef.current?.stop()
      sessionRef.current = null
      setStreamReady(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function speak() {
    if (!sessionRef.current || !text.trim() || !voiceId.trim()) return
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/tts-pcm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice_id: voiceId.trim() }),
      })
      if (!res.ok) throw new Error(await res.text())
      const { audio_base64 } = (await res.json()) as { audio_base64: string }
      sessionRef.current.repeatAudio(audio_base64)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  function interrupt() {
    sessionRef.current?.interrupt()
  }

  const connected = state === SessionState.CONNECTED

  return (
    <main className="min-h-screen bg-black text-white p-6 flex flex-col items-center gap-4">
      <h1 className="text-xl font-semibold">LiveAvatar Lite mode test — Wayne speaking Korean</h1>

      <div className="flex items-center gap-3 text-sm">
        <Dot color={connected ? 'bg-green-400' : state === SessionState.CONNECTING ? 'bg-yellow-400' : 'bg-gray-500'} />
        <span className="font-mono uppercase">{state}</span>
        {streamReady && <span className="text-green-400">stream ready</span>}
        {avatarTalking && <span className="text-blue-300">speaking…</span>}
      </div>

      <div className="w-full max-w-2xl aspect-video bg-zinc-900 rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain"
        />
      </div>

      <div className="flex gap-2">
        {!connected ? (
          <button
            onClick={startSession}
            disabled={busy}
            className="px-4 py-2 bg-white text-black rounded font-medium disabled:opacity-50"
          >
            {busy ? 'Starting…' : 'Start session'}
          </button>
        ) : (
          <button
            onClick={stopSession}
            disabled={busy}
            className="px-4 py-2 bg-red-600 rounded font-medium disabled:opacity-50"
          >
            Stop
          </button>
        )}
      </div>

      <div className="w-full max-w-2xl flex flex-col gap-2">
        <label className="text-xs uppercase tracking-wide text-gray-400">
          ElevenLabs Korean voice ID
        </label>
        <input
          value={voiceId}
          onChange={(e) => setVoiceId(e.target.value)}
          placeholder="paste your Korean ElevenLabs voice_id here"
          className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-700 text-sm font-mono"
        />

        <label className="text-xs uppercase tracking-wide text-gray-400 mt-2">Text (Korean)</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-700 text-sm"
        />

        <div className="flex gap-2">
          <button
            onClick={speak}
            disabled={!connected || busy || !text.trim() || !voiceId.trim()}
            className="px-4 py-2 bg-blue-600 rounded font-medium disabled:opacity-40"
          >
            Speak
          </button>
          <button
            onClick={interrupt}
            disabled={!avatarTalking}
            className="px-4 py-2 bg-zinc-700 rounded font-medium disabled:opacity-40"
          >
            Interrupt
          </button>
        </div>
      </div>

      {error && (
        <div className="w-full max-w-2xl px-3 py-2 rounded bg-red-950 border border-red-800 text-red-200 text-sm font-mono whitespace-pre-wrap">
          {error}
        </div>
      )}

      <p className="text-xs text-gray-500 mt-4 max-w-2xl text-center">
        Sandbox session — does not consume credits. Avatar: Wayne ({WAYNE_AVATAR_ID.slice(0, 8)}…).
        Audio is generated by ElevenLabs in PCM 24kHz and fed to LiveAvatar via repeatAudio().
      </p>
    </main>
  )
}

function Dot({ color }: { color: string }) {
  return <div className={`w-2 h-2 rounded-full ${color}`} />
}
