import { describe, it, expect, vi } from 'vitest'
import { POST as suggPOST } from '@/app/api/get-clinical-suggestions/route'

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return {
        generateContent: async () => ({ response: { text: () => JSON.stringify({ suggestions: ['Pedir BH'] }) } })
      }
    }
  }
}))

describe('/api/get-clinical-suggestions', () => {
  it('returns suggestions array', async () => {
    const res: any = await suggPOST({ json: async () => ({ reportText: '...' }) } as any)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data.suggestions)).toBe(true)
  })
})

