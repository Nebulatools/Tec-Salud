import OpenAI from 'openai'

/**
 * OpenRouter client - unified access to 500+ AI models
 * Compatible with OpenAI SDK, just a different baseURL
 */
export const ai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'X-Title': 'EzyAI Medical',
  },
})

/**
 * Default model for text generation tasks
 * Can be overridden via AI_MODEL environment variable
 */
export const MODEL = process.env.AI_MODEL || 'google/gemini-2.5-flash'

/**
 * Model options for different use cases
 */
export const MODELS = {
  // Best balance - recommended for medical extraction
  default: 'google/gemini-2.5-flash',
  // Latest with best reasoning (preview)
  latest: 'google/gemini-3-flash-preview',
  // Budget option - still good quality
  lite: 'google/gemini-2.5-flash-lite',
  // More capable - for complex extraction
  smart: 'anthropic/claude-sonnet-4',
} as const

export type ModelKey = keyof typeof MODELS
