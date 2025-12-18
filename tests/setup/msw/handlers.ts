import { http, HttpResponse } from 'msw';

interface ParseTranscriptBody {
  transcript?: string
  patientId?: string
  [key: string]: unknown
}

export const handlers = [
  http.post('/api/enrich-report', async () => {
    return HttpResponse.json({
      improvedReport: 'Reporte mejorado (mock)',
      missingInformation: [],
      questionsForDoctor: []
    });
  }),
  http.post('/api/get-clinical-suggestions', async () => {
    return HttpResponse.json({
      suggestions: ['Pedir BH', 'Control de PA en 1 semana']
    });
  }),
  http.post('/api/parse-transcript', async ({ request }) => {
    const raw = await request.json().catch(() => ({}));
    const body = (raw && typeof raw === 'object') ? raw as ParseTranscriptBody : {}
    if (!body?.transcript) {
      return new HttpResponse(JSON.stringify({ error: 'missing transcript' }), { status: 400 });
    }
    return HttpResponse.json({
      patient: { id: body.patientId ?? 'uuid-patient-mock', name: 'Paciente Demo' },
      symptoms: ['tos', 'fiebre'],
      diagnoses: ['IRA'],
      medications: [{ name: 'amoxicilina', dose: '500 mg', route: 'VO', frequency: '8h', duration: '7 días' }]
    });
  }),
  http.post('/api/clinical-extractions', async ({ request }) => {
    const raw = await request.json().catch(() => ({}));
    const body = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {}
    return HttpResponse.json({
      id: 'uuid-extraction-mock',
      extracted_at: new Date().toISOString(),
      ...body
    });
  }),
  http.get('/api/clinical-extractions', async () => {
    return HttpResponse.json({
      data: [{
        id: 'uuid-extraction-mock',
        extracted_at: new Date().toISOString(),
        patientId: 'uuid-patient-mock'
      }]
    });
  }),
  http.post('/api/medical-reports', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: 'uuid-report-mock',
      ...(body as Record<string, unknown>)
    });
  })
];
