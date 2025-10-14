import { describe, it, expect, vi } from 'vitest'
import { POST as mrPOST } from '@/app/api/medical-reports/route'

vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      from: (table: string) => {
        if (table === 'patients' || table === 'doctors' || table === 'medical_reports') {
          return {
            select: () => ({
              // support direct single()
              single: async () => ({ data: { id: 'x' }, error: null }),
              // support .limit(1).single()
              limit: () => ({ single: async () => ({ data: { id: 'x' }, error: null }) }),
              // support .eq(...).single()
              eq: () => ({ single: async () => ({ data: { id: 'x' }, error: null }) }),
              // support maybeSingle()
              maybeSingle: async () => ({ data: null, error: null }),
            }),
            insert: (rows: any[]) => ({ select: () => ({ single: async () => ({ data: { id: 'uuid-fake', ...rows[0] }, error: null }) }) }),
            update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: { id: 'uuid-fake' }, error: null }) }) }) }),
          }
        }
        return {}
      }
    }
  }
})

describe('/api/medical-reports', () => {
  it('saves with original_transcript and returns id', async () => {
    const res: any = await mrPOST({ json: async () => ({ patient_id: 'p1', content: 'c', original_transcript: 't' }) } as any)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBeTruthy()
  })
})
