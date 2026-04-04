'use client'

import { useEffect, useState } from 'react'

interface PersonaAvatarProps {
  name: string
  isTalking?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animate?: boolean
  aggression?: number  // 0-1, affects color warmth
}

const SIZE_MAP = {
  sm: { container: 48, face: 36 },
  md: { container: 72, face: 54 },
  lg: { container: 112, face: 84 },
  xl: { container: 160, face: 120 },
}

export function PersonaAvatar({
  name,
  isTalking = false,
  size = 'md',
  animate = false,
  aggression = 0.5,
}: PersonaAvatarProps) {
  const [blinking, setBlinking] = useState(false)
  const [mouthOpen, setMouthOpen] = useState(false)
  const { container, face } = SIZE_MAP[size]

  // Random blink
  useEffect(() => {
    const scheduleBlink = () => {
      const delay = 2000 + Math.random() * 4000
      return setTimeout(() => {
        setBlinking(true)
        setTimeout(() => {
          setBlinking(false)
          scheduleBlink()
        }, 150)
      }, delay)
    }
    const t = scheduleBlink()
    return () => clearTimeout(t)
  }, [])

  // Mouth animation while talking
  useEffect(() => {
    if (!isTalking) {
      setMouthOpen(false)
      return
    }
    const interval = setInterval(() => {
      setMouthOpen((v) => !v)
    }, 200)
    return () => clearInterval(interval)
  }, [isTalking])

  // Color based on aggression: cool blue → warm blue-slate
  const skinHue = Math.round(210 - aggression * 20)  // 210 (pure blue) → 190 (teal-blue)
  const skinColor = `hsl(${skinHue}, 60%, 75%)`
  const skinDark = `hsl(${skinHue}, 50%, 60%)`
  const hairColor = aggression > 0.6 ? '#374151' : '#1e40af'

  const r = face / 2
  const cx = r
  const cy = r

  // Eye positions
  const eyeY = cy - r * 0.12
  const eyeLX = cx - r * 0.28
  const eyeRX = cx + r * 0.28
  const eyeR = r * 0.1
  const eyeScaleY = blinking ? 0.08 : 1

  // Mouth
  const mouthY = cy + r * 0.28
  const mouthW = r * 0.4
  const mouthDepth = mouthOpen ? r * 0.15 : r * 0.06

  // Eyebrow slant based on aggression
  const browSlant = aggression > 0.5 ? r * 0.06 : 0

  return (
    <div
      className={animate ? 'animate-float' : ''}
      style={{ width: container, height: container, position: 'relative' }}
    >
      {/* Glow ring when talking */}
      {isTalking && (
        <div
          style={{
            position: 'absolute',
            inset: -6,
            borderRadius: '50%',
            border: '3px solid #3b82f6',
            opacity: 0.6,
            animation: 'pulse-ring 1s ease-out infinite',
          }}
        />
      )}

      <svg
        width={container}
        height={container}
        viewBox={`0 0 ${container} ${container}`}
        style={{ borderRadius: '50%', overflow: 'visible' }}
      >
        {/* Shadow */}
        <ellipse
          cx={container / 2}
          cy={container - 4}
          rx={face * 0.42}
          ry={face * 0.08}
          fill="rgba(37,99,235,0.15)"
        />

        {/* Body / shirt */}
        <ellipse
          cx={container / 2}
          cy={container + face * 0.3}
          rx={face * 0.55}
          ry={face * 0.4}
          fill="#1d4ed8"
        />

        {/* Neck */}
        <rect
          x={container / 2 - face * 0.13}
          y={container / 2 + r * 0.55}
          width={face * 0.26}
          height={face * 0.2}
          fill={skinDark}
          rx={4}
        />

        {/* Head */}
        <ellipse
          cx={container / 2}
          cy={container / 2}
          rx={r}
          ry={r * 1.05}
          fill={skinColor}
        />

        {/* Hair */}
        <ellipse
          cx={container / 2}
          cy={container / 2 - r * 0.55}
          rx={r * 0.95}
          ry={r * 0.55}
          fill={hairColor}
        />
        <rect
          x={container / 2 - r * 0.95}
          y={container / 2 - r * 0.7}
          width={r * 1.9}
          height={r * 0.35}
          fill={hairColor}
          rx={4}
        />

        {/* Left eye */}
        <ellipse
          cx={container / 2 - r * 0.28}
          cy={container / 2 + eyeY - r}
          rx={eyeR}
          ry={eyeR * eyeScaleY}
          fill="#1e3a8a"
        />
        {/* Left pupil highlight */}
        <circle
          cx={container / 2 - r * 0.25}
          cy={container / 2 + eyeY - r - eyeR * 0.3}
          r={eyeR * 0.25}
          fill="white"
          opacity={blinking ? 0 : 1}
        />

        {/* Right eye */}
        <ellipse
          cx={container / 2 + r * 0.28}
          cy={container / 2 + eyeY - r}
          rx={eyeR}
          ry={eyeR * eyeScaleY}
          fill="#1e3a8a"
        />
        <circle
          cx={container / 2 + r * 0.31}
          cy={container / 2 + eyeY - r - eyeR * 0.3}
          r={eyeR * 0.25}
          fill="white"
          opacity={blinking ? 0 : 1}
        />

        {/* Left eyebrow */}
        <path
          d={`M ${container / 2 - r * 0.38} ${container / 2 + eyeY - r - eyeR * 1.6 - browSlant}
              Q ${container / 2 - r * 0.28} ${container / 2 + eyeY - r - eyeR * 1.9}
                ${container / 2 - r * 0.18} ${container / 2 + eyeY - r - eyeR * 1.6}`}
          stroke={hairColor}
          strokeWidth={r * 0.07}
          fill="none"
          strokeLinecap="round"
        />

        {/* Right eyebrow */}
        <path
          d={`M ${container / 2 + r * 0.18} ${container / 2 + eyeY - r - eyeR * 1.6}
              Q ${container / 2 + r * 0.28} ${container / 2 + eyeY - r - eyeR * 1.9}
                ${container / 2 + r * 0.38} ${container / 2 + eyeY - r - eyeR * 1.6 + browSlant}`}
          stroke={hairColor}
          strokeWidth={r * 0.07}
          fill="none"
          strokeLinecap="round"
        />

        {/* Nose */}
        <path
          d={`M ${container / 2} ${container / 2 + r * 0.05}
              Q ${container / 2 + r * 0.12} ${container / 2 + r * 0.2}
                ${container / 2 + r * 0.1} ${container / 2 + r * 0.22}`}
          stroke={skinDark}
          strokeWidth={r * 0.06}
          fill="none"
          strokeLinecap="round"
        />

        {/* Mouth */}
        <path
          d={`M ${container / 2 - mouthW} ${container / 2 + mouthY - r}
              Q ${container / 2} ${container / 2 + mouthY - r + mouthDepth}
                ${container / 2 + mouthW} ${container / 2 + mouthY - r}`}
          stroke="#1e3a8a"
          strokeWidth={r * 0.07}
          fill={mouthOpen ? '#1e3a8a' : 'none'}
          strokeLinecap="round"
        />

        {/* Ear left */}
        <ellipse
          cx={container / 2 - r * 0.96}
          cy={container / 2}
          rx={r * 0.1}
          ry={r * 0.16}
          fill={skinColor}
          stroke={skinDark}
          strokeWidth={1}
        />
        {/* Ear right */}
        <ellipse
          cx={container / 2 + r * 0.96}
          cy={container / 2}
          rx={r * 0.1}
          ry={r * 0.16}
          fill={skinColor}
          stroke={skinDark}
          strokeWidth={1}
        />
      </svg>

      {/* Name badge */}
      {size !== 'sm' && (
        <div
          style={{
            position: 'absolute',
            bottom: size === 'xl' ? -28 : -22,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#2563eb',
            color: 'white',
            fontSize: size === 'xl' ? 13 : 11,
            fontWeight: 600,
            padding: '2px 10px',
            borderRadius: 20,
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </div>
      )}
    </div>
  )
}
