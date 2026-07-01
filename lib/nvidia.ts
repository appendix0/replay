import OpenAI from 'openai'

// NVIDIA NIM exposes an OpenAI-compatible endpoint.
export const nvidia = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY!,
  baseURL: 'https://integrate.api.nvidia.com/v1',
})

export const ROLEPLAY_MODEL = 'qwen/qwen3-next-80b-a3b-instruct'

// Per-turn scoring and the end-of-session report both run on Qwen. Qwen starts
// emitting tokens in ~1s, whereas DeepSeek-pro does a ~32s silent "reasoning"
// phase first — long enough for the idle socket to be dropped behind NAT, which
// times the report out on the free tier. Qwen returns the same structured JSON,
// fast and reliably. To use DeepSeek for the report instead, set FEEDBACK_MODEL
// to 'deepseek-ai/deepseek-v4-pro' (the call is streamed, but riskier here).
export const EVAL_MODEL = 'qwen/qwen3-next-80b-a3b-instruct'
export const FEEDBACK_MODEL = 'qwen/qwen3-next-80b-a3b-instruct'

export const ROLEPLAY_MAX_TOKENS = 512
export const EVAL_MAX_TOKENS = 256
