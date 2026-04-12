'use client'

import { useCallback, useEffect, useRef, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { CharacterDisplay } from '@/components/CharacterDisplay'
import { VoiceButton } from '@/components/VoiceButton'
import type { Message, Scenario, Session, EvaluationScores } from '@/types'

interface SessionData {
  session: Session & { scenarios: Scenario }
  messages: Message[]
}

interface DisplayMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  scores?: EvaluationScores
}

// Timer-based speaking simulation — used when TTS is not configured.
function estimateSpeakingDuration(text: string): number {
  return Math.min(5000, Math.max(800, text.length * 50))
}

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [ending, setEnding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showScores, setShowScores] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const speakingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Stable ref to the current audio amplitude getter — read every frame by MetaverseCharacter.
  // Points to a live Web Audio AnalyserNode getter during TTS playback, or () => 0 otherwise.
  const amplitudeGetterRef = useRef<() => number>(() => 0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Cleanup audio + timers on unmount
  useEffect(() => {
    return () => {
      if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current)
      audioRef.current?.pause()
      audioCtxRef.current?.close()
    }
  }, [])

  useEffect(() => {
    fetch(`/api/sessions/${id}`)
      .then((r) => r.json())
      .then((data: SessionData) => {
        setSessionData(data)
        const display: DisplayMessage[] = data.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          scores:
            m.role === 'user' && m.appropriateness_score !== null
              ? {
                  appropriateness: m.appropriateness_score ?? 0,
                  coherence: m.coherence_score ?? 0,
                  tone: m.tone_score ?? 0,
                }
              : undefined,
        }))
        setMessages(display)
      })
      .catch(() => setError('세션을 불러올 수 없습니다.'))
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  // Called every time the assistant sends a message.
  // If the persona has a tts_voice_id, plays ElevenLabs TTS and drives
  // lip sync via Web Audio amplitude analysis.
  // Falls back to a timer simulation when TTS is not configured.
  const onAssistantMessage = useCallback(async (content: string, voiceId?: string) => {
    // Stop any previous audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current)
    amplitudeGetterRef.current = () => 0

    setIsSpeaking(true)

    if (voiceId) {
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: content, voice_id: voiceId }),
        })

        if (res.ok) {
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          const audio = new Audio(url)
          audioRef.current = audio

          // Web Audio API — used to read amplitude every frame for lip sync
          if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
            audioCtxRef.current = new AudioContext()
          }
          const ctx = audioCtxRef.current
          const analyser = ctx.createAnalyser()
          analyser.fftSize = 256
          const source = ctx.createMediaElementSource(audio)
          source.connect(analyser)
          analyser.connect(ctx.destination)

          const dataArray = new Uint8Array(analyser.frequencyBinCount)
          amplitudeGetterRef.current = () => {
            analyser.getByteFrequencyData(dataArray)
            // Average the lower frequency bins (speech frequencies)
            const slice = dataArray.slice(0, dataArray.length / 2)
            return slice.reduce((a, b) => a + b, 0) / slice.length / 255
          }

          audio.onended = () => {
            URL.revokeObjectURL(url)
            amplitudeGetterRef.current = () => 0
            setIsSpeaking(false)
          }

          // Resume AudioContext if suspended (browser autoplay policy)
          if (ctx.state === 'suspended') await ctx.resume()
          await audio.play()
          return // TTS path handled — skip fallback below
        }
      } catch (e) {
        console.warn('TTS failed, falling back to timer:', e)
      }
    }

    // Fallback: timer-based simulation (no TTS configured or TTS failed)
    speakingTimerRef.current = setTimeout(() => {
      amplitudeGetterRef.current = () => 0
      setIsSpeaking(false)
    }, estimateSpeakingDuration(content))
  }, [])

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    setInput('')
    setSending(true)
    setError(null)

    // Optimistic user message
    const tempId = `temp-${Date.now()}`
    setMessages((prev) => [...prev, { id: tempId, role: 'user', content: trimmed }])

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: id, content: trimmed }),
      })
      if (!res.ok) throw new Error(await res.text())

      const data = await res.json()
      const assistantContent: string = data.assistant_message.content

      // Replace temp message with real data + add assistant reply
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== tempId)
          .concat([
            {
              id: data.user_message.id,
              role: 'user',
              content: trimmed,
              scores: data.evaluation,
            },
            {
              id: data.assistant_message.id,
              role: 'assistant',
              content: assistantContent,
            },
          ]),
      )

      // Trigger TTS + lip sync (falls back to timer if voice not configured)
      onAssistantMessage(assistantContent, persona?.tts_voice_id)
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setError(e instanceof Error ? e.message : '메시지 전송에 실패했습니다.')
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  async function endSession() {
    setEnding(true)
    try {
      const res = await fetch(`/api/sessions/${id}/end`, { method: 'POST' })
      if (!res.ok) throw new Error(await res.text())
      router.push(`/session/${id}/feedback`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '세션 종료에 실패했습니다.')
      setEnding(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const scenario = sessionData?.session?.scenarios
  const persona = scenario?.persona_config
  const userTurns = messages.filter((m) => m.role === 'user' && m.scores)
  const avgScore =
    userTurns.length > 0
      ? Math.round(
          (userTurns.reduce(
            (sum, m) =>
              sum +
              ((m.scores!.appropriateness + m.scores!.coherence + m.scores!.tone) / 3) * 10,
            0,
          ) /
            userTurns.length),
        )
      : null

  if (error && !sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f7ff]">
        <div className="text-center p-6">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm"
          >
            홈으로
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="h-screen flex flex-col bg-[#f0f7ff] max-w-lg mx-auto">
      {/* Header */}
      <header className="bg-white border-b border-blue-100 px-4 py-3 flex items-center gap-3 shadow-sm flex-shrink-0">
        <button
          onClick={() => router.push('/')}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-50 transition-colors"
        >
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Character + Persona info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {persona ? (
            <CharacterDisplay
              name={persona.name}
              size="sm"
              isTalking={sending || isSpeaking}
              aggression={persona.aggression}
              avatarId={persona.avatar_id}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-100 animate-pulse" />
          )}
          <div className="min-w-0">
            <p className="font-bold text-blue-900 text-sm leading-none truncate">
              {persona?.name ?? '...'}
            </p>
            <p className="text-xs text-blue-400 mt-0.5 truncate">{scenario?.title}</p>
          </div>
        </div>

        {/* Live score + end button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {avgScore !== null && (
            <button
              onClick={() => setShowScores((v) => !v)}
              className="px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700"
            >
              {avgScore}점
            </button>
          )}
          <button
            onClick={endSession}
            disabled={ending || messages.length < 2}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-full
                       hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {ending ? '...' : '종료'}
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && !sending && sessionData && (
          <div className="text-center pt-8">
            <div className="mb-4 flex justify-center">
              {persona && (
                <CharacterDisplay
                  name={persona.name}
                  size="lg"
                  animate
                  isTalking={isSpeaking}
                  aggression={persona.aggression}
                  avatarId={persona.avatar_id}
                  getAmplitude={() => amplitudeGetterRef.current()}
                />
              )}
            </div>
            <div className="mt-8 bg-white rounded-2xl p-4 border border-blue-100 text-left mx-2">
              <p className="text-sm text-blue-800 font-medium mb-1">{persona?.name}</p>
              <p className="text-sm text-blue-600 leading-relaxed">
                안녕하세요. 준비가 되셨으면 대화를 시작해주세요.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id}>
            <ChatBubble message={msg} personaName={persona?.name ?? ''} showScores={showScores} />
          </div>
        ))}

        {/* Typing indicator */}
        {sending && (
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex-shrink-0" />
            <div className="bg-white rounded-2xl rounded-bl-none px-4 py-3 border border-blue-100">
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 bg-blue-400 rounded-full"
                    style={{
                      animation: `wave 1s ease-in-out infinite`,
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center">
            <span className="text-xs text-red-500 bg-red-50 px-3 py-1 rounded-full">{error}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="bg-white border-t border-blue-100 px-4 py-3 flex-shrink-0">
        <div className="flex items-end gap-2">
          <VoiceButton
            onResult={(t) => {
              setInput((prev) => prev + t)
              inputRef.current?.focus()
            }}
            disabled={sending}
          />

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하거나 🎙️ 버튼을 누르세요..."
              rows={1}
              disabled={sending}
              className="w-full resize-none rounded-2xl border border-blue-200 bg-blue-50
                         px-4 py-2.5 text-sm text-blue-900 placeholder:text-blue-300
                         focus:outline-none focus:border-blue-400 focus:bg-white
                         transition-colors disabled:opacity-50 max-h-28 overflow-y-auto"
              style={{ lineHeight: '1.5' }}
              onInput={(e) => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = `${Math.min(el.scrollHeight, 112)}px`
              }}
            />
          </div>

          <button
            onClick={() => sendMessage(input)}
            disabled={sending || !input.trim()}
            className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center
                       flex-shrink-0 hover:bg-blue-700 transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </main>
  )
}

function ChatBubble({
  message,
  personaName,
  showScores,
}: {
  message: DisplayMessage
  personaName: string
  showScores: boolean
}) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar for persona messages */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-blue-700">{personaName[0]}</span>
        </div>
      )}

      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed
            ${isUser
              ? 'bg-blue-600 text-white rounded-br-none'
              : 'bg-white text-blue-900 rounded-bl-none border border-blue-100'
            }`}
        >
          {message.content}
        </div>

        {/* Per-turn scores (user messages only) */}
        {isUser && message.scores && showScores && (
          <div className="flex gap-1 flex-wrap">
            <ScorePill label="적절성" value={message.scores.appropriateness} />
            <ScorePill label="일관성" value={message.scores.coherence} />
            <ScorePill label="톤" value={message.scores.tone} />
          </div>
        )}
      </div>
    </div>
  )
}

function ScorePill({ label, value }: { label: string; value: number }) {
  const color =
    value >= 7 ? 'bg-blue-100 text-blue-700' : value >= 4 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
      {label} {value.toFixed(1)}
    </span>
  )
}
