import { describe, it, expect, vi } from 'vitest'
import { POST as enrichPOST } from '@/app/api/enrich-report/route'

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return {
        generateContent: async () => ({ response: { text: () => JSON.stringify({
          improvedReport: 'Reporte OK', missingInformation: [], questionsForDoctor: []
        }) } })
      }
    }
  }
}))

describe('/api/enrich-report', () => {
  it('returns valid JSON', async () => {
    const res: any = await enrichPOST({ json: async () => ({ transcript: 'texto' }) } as any)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(typeof data.improvedReport).toBe('string')
    expect(Array.isArray(data.missingInformation)).toBe(true)
    expect(Array.isArray(data.questionsForDoctor)).toBe(true)
  })
})

