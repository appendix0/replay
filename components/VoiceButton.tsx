'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface VoiceButtonProps {
  onResult: (transcript: string) => void
  disabled?: boolean
}

type SpeechRecognitionType = typeof window extends { SpeechRecognition: infer T } ? T : never

export function VoiceButton({ onResult, disabled }: VoiceButtonProps) {
  const [isListening, setIsListening] = useState(false)
  const [supported, setSupported] = useState(false)
  const recognitionRef = useRef<InstanceType<SpeechRecognitionType> | null>(null)

  useEffect(() => {
    const SpeechRecognition =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setSupported(!!SpeechRecognition)
  }, [])

  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.lang = 'ko-KR'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onresult = (event: { results: { transcript: string }[][] }) => {
      const transcript = event.results[0][0].transcript
      onResult(transcript)
    }

    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
    }

    recognition.onerror = () => {
      setIsListening(false)
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [onResult])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  if (!supported) return null

  return (
    <button
      type="button"
      onPointerDown={startListening}
      onPointerUp={stopListening}
      onPointerLeave={stopListening}
      disabled={disabled}
      className="relative flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center
                 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed
                 select-none touch-none"
      style={{
        background: isListening ? '#ef4444' : '#dbeafe',
        boxShadow: isListening ? '0 0 0 4px rgba(239,68,68,0.2)' : 'none',
      }}
      aria-label={isListening ? '녹음 중지' : '음성 입력'}
    >
      {/* Pulse ring when listening */}
      {isListening && (
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: 'rgba(239,68,68,0.3)',
            animation: 'pulse-ring 1s ease-out infinite',
          }}
        />
      )}

      {/* Microphone icon */}
      <svg
        className="w-5 h-5 relative z-10"
        style={{ color: isListening ? 'white' : '#2563eb' }}
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z" />
        <path d="M19 10a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.93V19H9a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-2.07A7 7 0 0 0 19 10z" />
      </svg>

      {/* Sound waves when listening */}
      {isListening && (
        <span className="absolute -right-1 -top-1 flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-0.5 rounded-full"
              style={{
                height: 10,
                background: '#ef4444',
                animation: `wave 0.8s ease-in-out infinite`,
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </span>
      )}
    </button>
  )
}
