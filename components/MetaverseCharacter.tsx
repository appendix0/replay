'use client'

import { Suspense, useRef, useEffect, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Environment } from '@react-three/drei'
import * as THREE from 'three'
import dynamic from 'next/dynamic'

// RPM avatar URL: https://models.readyplayer.me/{avatarId}.glb
// Request ARKit morph targets for lip sync, and optimize texture size
function buildAvatarUrl(avatarId: string): string {
  const base = `https://models.readyplayer.me/${avatarId}.glb`
  const params = new URLSearchParams({
    morphTargets: 'ARKit,Oculus Visemes',
    textureAtlas: '1024',
    lod: '0',
    pose: 'A',
    useHands: 'false',
  })
  return `${base}?${params}`
}

// Morph target names to drive mouth (in priority order)
const MOUTH_MORPH_TARGETS = ['jawOpen', 'mouthOpen', 'viseme_O', 'viseme_aa']

interface AvatarModelProps {
  avatarUrl: string
  isTalking: boolean
  getAmplitude: () => number
}

function AvatarModel({ avatarUrl, isTalking, getAmplitude }: AvatarModelProps) {
  const { scene } = useGLTF(avatarUrl, '/draco/')
  const meshesWithMouth = useRef<{ mesh: THREE.SkinnedMesh; idx: number }[]>([])

  useEffect(() => {
    meshesWithMouth.current = []
    scene.traverse((child) => {
      if (!(child instanceof THREE.SkinnedMesh)) return
      if (!child.morphTargetDictionary || !child.morphTargetInfluences) return

      for (const name of MOUTH_MORPH_TARGETS) {
        const idx = child.morphTargetDictionary[name]
        if (idx !== undefined) {
          meshesWithMouth.current.push({ mesh: child, idx })
          break // one entry per mesh, highest-priority target wins
        }
      }
    })
  }, [scene])

  useFrame(() => {
    const target = isTalking ? Math.min(0.85, getAmplitude() * 2.0) : 0

    for (const { mesh, idx } of meshesWithMouth.current) {
      if (!mesh.morphTargetInfluences) continue
      // Smooth lerp toward target — avoids abrupt snapping
      mesh.morphTargetInfluences[idx] = THREE.MathUtils.lerp(
        mesh.morphTargetInfluences[idx],
        target,
        isTalking ? 0.35 : 0.2,
      )
    }
  })

  // Position the model so the head fills a bust-shot framing
  return <primitive object={scene} position={[0, -1.3, 0]} />
}

function AvatarFallback() {
  return (
    <mesh>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshStandardMaterial color="#dbeafe" />
    </mesh>
  )
}

const SIZE_PX: Record<string, number> = {
  sm: 48,
  md: 220,
  lg: 300,
  xl: 380,
}

export interface MetaverseCharacterProps {
  avatarId: string
  isTalking?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  getAmplitude?: () => number
}

function MetaverseCharacterInner({
  avatarId,
  isTalking = false,
  size = 'lg',
  getAmplitude,
}: MetaverseCharacterProps) {
  const px = SIZE_PX[size] ?? 300
  const avatarUrl = buildAvatarUrl(avatarId)
  const stableGetAmplitude = useCallback(() => getAmplitude?.() ?? 0, [getAmplitude])

  return (
    <div
      style={{ width: px, height: px, position: 'relative', borderRadius: '50%', overflow: 'hidden' }}
    >
      {/* Speaking glow ring */}
      {isTalking && (
        <div
          style={{
            position: 'absolute',
            inset: -4,
            borderRadius: '50%',
            border: '3px solid #3b82f6',
            opacity: 0.7,
            animation: 'pulse-ring 1s ease-out infinite',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        />
      )}

      <Canvas
        camera={{
          position: [0, 0.15, 0.75],
          fov: 38,
          near: 0.01,
          far: 10,
        }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        {/* Lighting */}
        <ambientLight intensity={1.2} />
        <directionalLight position={[1, 2, 2]} intensity={1.5} />
        <directionalLight position={[-1, 0.5, 1]} intensity={0.4} color="#bfdbfe" />

        <Suspense fallback={<AvatarFallback />}>
          <AvatarModel
            avatarUrl={avatarUrl}
            isTalking={isTalking}
            getAmplitude={stableGetAmplitude}
          />
          <Environment preset="studio" />
        </Suspense>
      </Canvas>
    </div>
  )
}

// Disable SSR — Three.js / WebGL requires browser
export const MetaverseCharacter = dynamic(
  () => Promise.resolve(MetaverseCharacterInner),
  { ssr: false },
)
