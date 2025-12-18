import { describe, it, expect, vi } from 'vitest'
import { POST as enrichPOST } from '@/app/api/enrich-report/route'

interface EnrichReportResponse {
  improvedReport: string
  missingInformation: string[]
  questionsForDoctor: string[]
}

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
    const res = await enrichPOST({ json: async () => ({ transcript: 'texto' }) } as unknown as Request)
    expect(res.status).toBe(200)
    const data = (await res.json()) as unknown as EnrichReportResponse
    expect(typeof data.improvedReport).toBe('string')
    expect(Array.isArray(data.missingInformation)).toBe(true)
    expect(Array.isArray(data.questionsForDoctor)).toBe(true)
  })
})

