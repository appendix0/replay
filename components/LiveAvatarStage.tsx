'use client'

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import {
  LiveAvatarSession,
  SessionEvent,
  SessionState,
  AgentEventsEnum,
} from '@heygen/liveavatar-web-sdk'

const LIVEAVATAR_API_URL = 'https://api.liveavatar.com'
// Default HeyGen LiveAvatar (Wayne). Personas may override via persona_config.liveavatar_id.
export const DEFAULT_LIVEAVATAR_ID = 'dd73ea75-1218-4ef3-92ce-606d5f7fbc0a'

export interface LiveAvatarHandle {
  /** Speak Korean text in the given ElevenLabs voice. Queues until the stream is live. */
  speak: (text: string, voiceId?: string) => void
}

interface LiveAvatarStageProps {
  avatarId?: string
  onSpeakingChange?: (speaking: boolean) => void
}

/**
 * Streaming HeyGen LiveAvatar video for a conversation partner.
 *
 * Flow: mint a sandbox token → open a LiveAvatarSession → attach the stream to
 * a <video> → feed each line as ElevenLabs PCM via repeatAudio().
 *
 * Playback needs a user gesture, so the video shows a "start" overlay until the
 * viewer taps it. Any speak() calls made before the stream is live are queued
 * and flushed once it connects (this covers the persona's opening line).
 */
export const LiveAvatarStage = forwardRef<LiveAvatarHandle, LiveAvatarStageProps>(
  function LiveAvatarStage({ avatarId, onSpeakingChange }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const sessionRef = useRef<LiveAvatarSession | null>(null)
    const pendingRef = useRef<Array<{ text: string; voiceId?: string }>>([])

    const [state, setState] = useState<SessionState>(SessionState.INACTIVE)
    const [streamReady, setStreamReady] = useState(false)
    const [starting, setStarting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const connected = state === SessionState.CONNECTED
    const live = connected && streamReady

    async function doSpeak(text: string, voiceId?: string) {
      if (!sessionRef.current || !text.trim() || !voiceId) return
      try {
        const res = await fetch('/api/tts-pcm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice_id: voiceId }),
        })
        if (!res.ok) throw new Error(await res.text())
        const { audio_base64 } = (await res.json()) as { audio_base64: string }
        sessionRef.current.repeatAudio(audio_base64)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    }

    useImperativeHandle(
      ref,
      () => ({
        speak: (text, voiceId) => {
          if (live) {
            void doSpeak(text, voiceId)
          } else {
            pendingRef.current.push({ text, voiceId })
          }
        },
      }),
      [live],
    )

    async function start() {
      setError(null)
      setStarting(true)
      try {
        const res = await fetch('/api/liveavatar/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar_id: avatarId || DEFAULT_LIVEAVATAR_ID }),
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
        session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => onSpeakingChange?.(true))
        session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => onSpeakingChange?.(false))

        await session.start()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setStarting(false)
      }
    }

    // Attach the stream and flush any queued speech once it's ready.
    useEffect(() => {
      if (!streamReady || !videoRef.current || !sessionRef.current) return
      sessionRef.current.attach(videoRef.current)
      const queued = pendingRef.current
      pendingRef.current = []
      for (const item of queued) void doSpeak(item.text, item.voiceId)
    }, [streamReady])

    // Tear the session down on unmount.
    useEffect(() => {
      return () => {
        sessionRef.current?.stop().catch(() => {})
      }
    }, [])

    return (
      <div className="relative w-full h-full overflow-hidden bg-blue-950">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {!live && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-blue-950/80 backdrop-blur-sm">
            {error ? (
              <p className="px-4 text-center text-xs text-red-200 font-mono">{error}</p>
            ) : starting || connected ? (
              <div className="flex items-center gap-2 text-blue-500 text-sm">
                <span className="w-4 h-4 rounded-full border-2 border-blue-300 border-t-transparent animate-spin" />
                연결 중…
              </div>
            ) : (
              <button
                onClick={start}
                className="px-5 py-2.5 rounded-full bg-blue-600 text-white text-sm font-semibold
                           hover:bg-blue-700 transition-colors"
              >
                🎬 대화 시작하기
              </button>
            )}
          </div>
        )}
      </div>
    )
  },
)
