import Anthropic from '@anthropic-ai/sdk'

// Single shared client — Anthropic SDK is stateless and safe to reuse
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export const ROLEPLAY_MODEL = 'claude-sonnet-4-6'
export const EVAL_MODEL = 'claude-sonnet-4-6'

// Max tokens per response
export const ROLEPLAY_MAX_TOKENS = 512
export const EVAL_MAX_TOKENS = 256
