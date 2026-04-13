'use client'

import type { User } from '@supabase/supabase-js'

export interface AuthState {
  user: User | null
  loading: boolean
}

// DEV BYPASS: skip Supabase auth entirely while testing main app features
const DEV_USER = {
  id: 'dev',
  email: 'dev@replay.local',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '',
} as unknown as User

export function useAuth(): AuthState {
  return { user: DEV_USER, loading: false }
}
