'use client'

import { PersonaAvatar } from './PersonaAvatar'
import { MetaverseCharacter } from './MetaverseCharacter'

export interface CharacterDisplayProps {
  name: string
  isTalking?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animate?: boolean
  aggression?: number
  // Set to an RPM avatar ID (UUID) to render the metaverse 3D character.
  // Format: the UUID from https://models.readyplayer.me/{avatarId}.glb
  avatarId?: string
  // Called every animation frame when isTalking=true.
  // Return 0–1 amplitude to drive lip sync. Wire to Web Audio analyser.
  getAmplitude?: () => number
  // Hook for future TTS-driven speaking end events.
  onSpeakingEnd?: () => void
}

/**
 * Single slot for the conversation partner character.
 *
 * Routing logic:
 * - avatarId present + size !== 'sm'  →  MetaverseCharacter (Three.js RPM avatar)
 * - otherwise                         →  PersonaAvatar (SVG fallback)
 *
 * The 'sm' size never goes 3D — it's used in the header where a tiny
 * Three.js canvas would be wasteful.
 */
export function CharacterDisplay({
  name,
  isTalking = false,
  size = 'md',
  animate = false,
  aggression = 0.5,
  avatarId,
  getAmplitude,
}: CharacterDisplayProps) {
  if (avatarId && size !== 'sm') {
    return (
      <MetaverseCharacter
        avatarId={avatarId}
        isTalking={isTalking}
        size={size}
        getAmplitude={getAmplitude}
      />
    )
  }

  return (
    <PersonaAvatar
      name={name}
      isTalking={isTalking}
      size={size}
      animate={animate}
      aggression={aggression}
    />
  )
}
