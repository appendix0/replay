// =====================
// Database entity types
// =====================

export type Difficulty = 'beginner' | 'intermediate' | 'advanced'
export type SessionStatus = 'active' | 'completed' | 'abandoned'
export type MessageRole = 'user' | 'assistant'

export interface PersonaConfig {
  name: string
  personality: string
  scenario: string
  aggression: number   // 0.0 - 1.0
  volatility: number   // 0.0 - 1.0
  patience: number     // 0.0 - 1.0
  language: string
  system_prompt: string
  avatar_id?: string   // future: metaverse character identifier (e.g. "rpm:abc123", "metahuman:kim")
  tts_voice_id?: string // future: TTS voice identifier for the character
}

export interface Scenario {
  id: string
  title: string
  description: string
  difficulty: Difficulty
  persona_config: PersonaConfig
  created_at: string
}

export interface Session {
  id: string
  user_id: string | null
  scenario_id: string
  started_at: string
  ended_at: string | null
  overall_score: number | null
  status: SessionStatus
  total_input_tokens: number
  total_output_tokens: number
}

export interface Message {
  id: string
  session_id: string
  role: MessageRole
  content: string
  turn_number: number
  appropriateness_score: number | null
  coherence_score: number | null
  tone_score: number | null
  input_tokens: number | null
  output_tokens: number | null
  created_at: string
}

export interface AxisScores {
  appropriateness: { avg: number; examples: string[] }
  coherence: { avg: number; examples: string[] }
  tone: { avg: number; examples: string[] }
}

export interface FeedbackReport {
  id: string
  session_id: string
  overall_score: number
  axis_scores: AxisScores
  improvements: string[]
  raw_analysis: string | null
  created_at: string
}

// =====================
// API request/response types
// =====================

export interface SendMessageRequest {
  session_id: string
  content: string
}

export interface EvaluationScores {
  appropriateness: number
  coherence: number
  tone: number
}

export interface SendMessageResponse {
  user_message: Message
  assistant_message: Message
  evaluation: EvaluationScores
  turn_number: number
}

export interface CreateSessionRequest {
  scenario_id: string
  user_id?: string
}

export interface CreateSessionResponse {
  session: Session
  scenario: Scenario
}

export interface TokenUsage {
  input_tokens: number
  output_tokens: number
}
