import { describe, it, expect, vi } from 'vitest'
import { POST as parsePOST } from '@/app/api/parse-transcript/route'

interface Medication {
  name: string
  dose: string
  route: string
  frequency: string
  duration: string
}

interface ParseTranscriptResponse {
  patient: {
    id: string
    name: string
  }
  symptoms: string[]
  diagnoses: string[]
  medications: Medication[]
}

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return {
        generateContent: async () => ({ response: { text: () => JSON.stringify({
          patient: { id: 'p1', name: 'Paciente Demo' },
          symptoms: ['tos'],
          diagnoses: ['IRA'],
          medications: [{ name: 'amoxicilina', dose: '500 mg', route: 'VO', frequency: 'cada 8 h', duration: '7 días' }]
        }) } })
      }
    }
  }
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { first_name: 'Juan', last_name: 'Pérez' }, error: null }) }) }) })
  }
}))

describe('/api/parse-transcript', () => {
  it('returns structured JSON and 400 on missing transcript', async () => {
    // Missing transcript
    const badRes = await parsePOST({ json: async () => ({}), url: 'http://test.local/api/parse-transcript' } as unknown as Request)
    expect(badRes.status).toBe(400)

    const okRes = await parsePOST({ json: async () => ({ transcript: 'texto', patientId: 'p1' }), url: 'http://test.local/api/parse-transcript' } as unknown as Request)
    expect(okRes.status).toBe(200)
    const data = (await okRes.json()) as unknown as ParseTranscriptResponse
    expect(data.patient).toBeTruthy()
    expect(Array.isArray(data.symptoms)).toBe(true)
  })
})

