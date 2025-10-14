import { describe, it, expect } from 'vitest'

describe('schemas - enrich-report', () => {
  it('returns expected shape', async () => {
    const res = await fetch('/api/enrich-report', { method: 'POST', body: JSON.stringify({ transcript: '...' }) })
    expect(res.ok).toBe(true)
    const json = await res.json()
    expect(typeof json.improvedReport).toBe('string')
    expect(Array.isArray(json.missingInformation)).toBe(true)
    expect(Array.isArray(json.questionsForDoctor)).toBe(true)
  })
})

describe('schemas - get-clinical-suggestions', () => {
  it('returns suggestions array', async () => {
    const res = await fetch('/api/get-clinical-suggestions', { method: 'POST', body: JSON.stringify({ reportText: '...' }) })
    expect(res.ok).toBe(true)
    const json = await res.json()
    expect(Array.isArray(json.suggestions)).toBe(true)
  })
})

describe('schemas - parse-transcript', () => {
  it('returns patient/symptoms/diagnoses/medications', async () => {
    const res = await fetch('/api/parse-transcript', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transcript: '...', patientId: 'p1' }) })
    expect(res.ok).toBe(true)
    const json = await res.json()
    expect(json.patient).toBeTruthy()
    expect(typeof json.patient.id).toBe('string')
    expect(typeof json.patient.name).toBe('string')
    expect(Array.isArray(json.symptoms)).toBe(true)
    expect(Array.isArray(json.diagnoses)).toBe(true)
    expect(Array.isArray(json.medications)).toBe(true)
  })
})

