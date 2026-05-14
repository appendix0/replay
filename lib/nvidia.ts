import OpenAI from 'openai'

// NVIDIA NIM exposes an OpenAI-compatible endpoint.
export const nvidia = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY!,
  baseURL: 'https://integrate.api.nvidia.com/v1',
})

export const ROLEPLAY_MODEL = 'qwen/qwen3-next-80b-a3b-instruct'
export const EVAL_MODEL = 'deepseek-ai/deepseek-v4-pro'

export const ROLEPLAY_MAX_TOKENS = 512
export const EVAL_MAX_TOKENS = 256
