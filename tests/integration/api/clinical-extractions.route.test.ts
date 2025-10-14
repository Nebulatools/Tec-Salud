import { describe, it, expect, vi } from 'vitest'
import { POST as cePOST, GET as ceGET } from '@/app/api/clinical-extractions/route'

vi.mock('@/lib/supabase', () => {
  const store: any[] = []
  return {
    supabase: {
      from: (table: string) => {
        if (table === 'clinical_extractions') {
          return {
            insert: (rows: any[]) => ({ select: () => ({ single: async () => ({ data: { id: 'uuid-fake', ...rows[0], extracted_at: new Date().toISOString() }, error: null }) }) }),
            select: () => ({ order: () => ({ eq: () => ({ range: async () => ({ data: store, error: null }) }), range: async () => ({ data: store, error: null }) }) }),
          }
        }
        if (table === 'doctors') {
          return { select: () => ({ limit: () => ({ single: async () => ({ data: { id: 'doctor_mock' }, error: null }) }) }) }
        }
        return {}
      },
    }
  }
})

describe('/api/clinical-extractions', () => {
  it('POST returns inserted row; GET returns list', async () => {
    const postRes: any = await cePOST({ json: async () => ({ appointmentId: 'apt1', patientId: 'p1', extraction: { patient: { id: 'p1', name: 'John' }, symptoms: [], diagnoses: [], medications: [] } }) } as any)
    expect(postRes.status).toBe(200)
    const postData = await postRes.json()
    expect(postData.id).toBeTruthy()
    expect(postData.extracted_at).toBeTruthy()

    const getRes: any = await ceGET({ url: 'http://test.local/api/clinical-extractions?patient_id=p1' } as any)
    expect(getRes.status).toBe(200)
    const list = await getRes.json()
    expect(Array.isArray(list)).toBe(true)
  })
})

