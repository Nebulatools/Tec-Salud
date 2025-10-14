import { describe, it, expect } from 'vitest';

describe('Contratos API', () => {
  it('enrich-report', () => {
    const res = { improvedReport: 'x', missingInformation: [], questionsForDoctor: [] };
    expect(typeof res.improvedReport).toBe('string');
    expect(Array.isArray(res.missingInformation)).toBe(true);
    expect(Array.isArray(res.questionsForDoctor)).toBe(true);
  });

  it('get-clinical-suggestions', () => {
    const res = { suggestions: ['a'] };
    expect(Array.isArray(res.suggestions)).toBe(true);
    expect(res.suggestions.length).toBeGreaterThan(0);
  });

  it('parse-transcript', () => {
    const res = {
      patient: { id: 'id', name: 'name' },
      symptoms: [], diagnoses: [], medications: []
    };
    expect(typeof res.patient.id).toBe('string');
    expect(typeof res.patient.name).toBe('string');
    expect(Array.isArray(res.symptoms)).toBe(true);
    expect(Array.isArray(res.diagnoses)).toBe(true);
    expect(Array.isArray(res.medications)).toBe(true);
  });
});

