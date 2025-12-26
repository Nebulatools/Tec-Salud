/**
 * Schema de Campos de Cumplimiento para Reportes Médicos
 *
 * Define qué campos son requeridos y su prioridad para la validación
 * determinística del cumplimiento normativo médico.
 */

export type FieldPriority = 'CRITICAL' | 'IMPORTANT' | 'CONDITIONAL';

export interface ComplianceField {
  id: string;
  name: string;
  description: string;
  priority: FieldPriority;
  /** Función que determina si el campo aplica dado el contexto */
  appliesWhen?: (context: ComplianceContext) => boolean;
  /** Path en el contenido del reporte donde buscar este campo */
  contentPaths: string[];
  /** Patrones regex para detectar el campo en texto libre */
  patterns: RegExp[];
}

export interface ComplianceContext {
  specialty?: string;
  hasLabOrders?: boolean;
  isFollowUp?: boolean;
  patientAge?: number;
  reportType?: string;
  baselineFormCompleted?: boolean;
  specialtyQuestionsAnswered?: boolean;
}

export interface ComplianceResult {
  field: ComplianceField;
  status: 'present' | 'missing' | 'incomplete';
  value?: string;
  suggestions?: string[];
}

export interface ComplianceReport {
  reportId: string;
  evaluatedAt: string;
  overallStatus: 'compliant' | 'needs_attention' | 'critical_missing';
  criticalMissing: ComplianceResult[];
  importantMissing: ComplianceResult[];
  conditionalMissing: ComplianceResult[];
  presentFields: ComplianceResult[];
  score: number; // 0-100
}

// ============================================
// CAMPOS CRÍTICOS (Siempre requeridos)
// ============================================

const CRITICAL_FIELDS: ComplianceField[] = [
  {
    id: 'motivo_consulta',
    name: 'Motivo de Consulta',
    description: 'Razón principal por la que el paciente acude a la consulta',
    priority: 'CRITICAL',
    contentPaths: ['motivo_consulta', 'chief_complaint', 'reason_for_visit'],
    patterns: [
      // Markdown format: **Motivo de Consulta:** or ## Motivo de Consulta
      /\*\*\s*Motivo\s*(de\s*)?(la\s*)?Consulta\s*\*\*\s*:?\s*(.+)/i,
      /##\s*\d*\.?\s*Motivo\s*(de\s*)?(la\s*)?Consulta\s*\n(.+)/i,
      // Plain text format
      /motivo\s*(de\s*)?(la\s*)?consulta\s*[:=]?\s*(.+)/i,
      /consulta\s*por\s*[:=]?\s*(.+)/i,
      /paciente\s*acude\s*por\s*[:=]?\s*(.+)/i,
      /reason\s*for\s*visit\s*[:=]?\s*(.+)/i,
      // En transcript: "lo remite... por un tema de..."
      /remite\s*.+\s*por\s*(un\s*tema\s*de\s*)?(.+)/i,
    ],
  },
  {
    id: 'diagnostico',
    name: 'Diagnóstico',
    description: 'Diagnóstico clínico del paciente',
    priority: 'CRITICAL',
    contentPaths: ['diagnostico', 'diagnosis', 'dx', 'impresion_diagnostica'],
    patterns: [
      // Markdown format
      /\*\*\s*Diagn[óo]stico\s*(principal)?\s*\*\*\s*:?\s*(.+)/i,
      /\*\*\s*Impresi[óo]n\s*Diagn[óo]stica\s*\*\*\s*:?\s*(.+)/i,
      /##\s*\d*\.?\s*Diagn[óo]stico\s*\n(.+)/i,
      // Plain text format
      /diagn[óo]stico\s*(principal)?\s*[:=]?\s*(.+)/i,
      /dx\s*[:=]?\s*(.+)/i,
      /impresi[óo]n\s*diagn[óo]stica\s*[:=]?\s*(.+)/i,
      /diagnosis\s*[:=]?\s*(.+)/i,
      // Conversational: "lo que llamamos..." or "tiene todas las características de..."
      /lo\s*que\s*(llamamos|conocemos\s*como)\s*(.+)/i,
      /caracter[íi]sticas\s*de\s*(lo\s*que\s*llamamos\s*)?(.+)/i,
    ],
  },
  {
    id: 'signos_vitales',
    name: 'Signos Vitales',
    description: 'Signos vitales básicos del paciente',
    priority: 'CRITICAL',
    contentPaths: ['signos_vitales', 'vital_signs', 'vitals'],
    patterns: [
      // Markdown format
      /\*\*\s*Signos\s*Vitales\s*\*\*\s*:?\s*(.+)/i,
      /\*\*\s*Presi[óo]n\s*(arterial)?\s*\*\*\s*:?\s*(.+)/i,
      // Presión arterial en varios formatos
      /(?:ta|presi[óo]n\s*arterial?)\s*[:=]?\s*(\d+\s*[\/sobre]+\s*\d+)/i,
      /la\s*tenemos\s*en\s*(\d+\s*sobre\s*\d+)/i,
      /(\d{2,3})\s*(?:\/|sobre)\s*(\d{2,3})\s*(?:mmHg)?/i,
      // FC, Temperatura
      /fc\s*[:=]?\s*(\d+)/i,
      /frecuencia\s*card[íi]aca\s*[:=]?\s*(\d+)/i,
      /temperatura\s*[:=]?\s*([\d.]+)/i,
      /signos\s*vitales\s*[:=]?\s*(.+)/i,
    ],
  },
  {
    id: 'exploracion_fisica',
    name: 'Exploración Física',
    description: 'Hallazgos de la exploración física',
    priority: 'CRITICAL',
    contentPaths: ['exploracion_fisica', 'physical_exam', 'examen_fisico'],
    patterns: [
      // Markdown format
      /\*\*\s*Exploraci[óo]n\s*F[íi]sica\s*\*\*\s*:?\s*(.+)/i,
      /\*\*\s*Examen\s*F[íi]sico\s*\*\*\s*:?\s*(.+)/i,
      /##\s*\d*\.?\s*Exploraci[óo]n\s*F[íi]sica\s*\n(.+)/i,
      // Plain text format
      /exploraci[óo]n\s*f[íi]sica\s*[:=]?\s*(.+)/i,
      /examen\s*f[íi]sico\s*[:=]?\s*(.+)/i,
      /physical\s*exam(ination)?\s*[:=]?\s*(.+)/i,
      /a\s*la\s*exploraci[óo]n\s*[:=]?\s*(.+)/i,
      // Hallazgos de auscultación
      /(?:pulmones|coraz[óo]n)\s*se\s*escucha[n]?\s*(.+)/i,
      /los\s*pulmones\s*(.+)/i,
      /el\s*ritmo\s*(?:es|card[íi]aco)\s*(.+)/i,
    ],
  },
];

// ============================================
// CAMPOS IMPORTANTES (Altamente recomendados)
// ============================================

const IMPORTANT_FIELDS: ComplianceField[] = [
  {
    id: 'plan_tratamiento',
    name: 'Plan de Tratamiento',
    description: 'Plan terapéutico y medicamentos prescritos',
    priority: 'IMPORTANT',
    contentPaths: ['plan_tratamiento', 'treatment_plan', 'tratamiento', 'plan'],
    patterns: [
      // Markdown format
      /\*\*\s*Plan\s*(de\s*)?(Tratamiento)?\s*\*\*\s*:?\s*(.+)/i,
      /##\s*\d*\.?\s*Plan\s*(de\s*)?(Tratamiento)?\s*\n(.+)/i,
      /\*\*\s*Tratamiento\s*\*\*\s*:?\s*(.+)/i,
      // Plain text format
      /plan\s*(de\s*)?(tratamiento)?\s*[:=]?\s*(.+)/i,
      /tratamiento\s*[:=]?\s*(.+)/i,
      /se\s*indica\s*[:=]?\s*(.+)/i,
      /prescripci[óo]n\s*[:=]?\s*(.+)/i,
      // Conversational: "va a empezar a tomar...", "vamos a ajustar..."
      /va\s*a\s*(empezar|tomar|usar)\s*(.+)/i,
      /vamos\s*a\s*(ajustar|agregar|indicar)\s*(.+)/i,
      /le\s*voy\s*a\s*(agregar|recetar|indicar)\s*(.+)/i,
    ],
  },
  {
    id: 'seguimiento',
    name: 'Plan de Seguimiento',
    description: 'Indicaciones de seguimiento y próxima cita',
    priority: 'IMPORTANT',
    contentPaths: ['seguimiento', 'follow_up', 'proxima_cita'],
    patterns: [
      // Markdown format
      /\*\*\s*Seguimiento\s*\*\*\s*:?\s*(.+)/i,
      /\*\*\s*Pr[óo]xima\s*[Cc]ita\s*\*\*\s*:?\s*(.+)/i,
      /##\s*\d*\.?\s*Seguimiento\s*\n(.+)/i,
      // Plain text format
      /seguimiento\s*[:=]?\s*(.+)/i,
      /pr[óo]xima\s*cita\s*[:=]?\s*(.+)/i,
      /control\s*(en)?\s*[:=]?\s*(.+)/i,
      /regresar\s*(en)?\s*[:=]?\s*(.+)/i,
      /follow[\s-]?up\s*[:=]?\s*(.+)/i,
      // Conversational: "lo quiero ver en...", "nos vemos en..."
      /lo\s*quiero\s*ver\s*en\s*(.+)/i,
      /nos\s*vemos\s*en\s*(.+)/i,
      /ver(lo)?\s*en\s*(\d+)\s*d[íi]as/i,
    ],
  },
  {
    id: 'alergias',
    name: 'Alergias',
    description: 'Alergias conocidas del paciente',
    priority: 'IMPORTANT',
    contentPaths: ['alergias', 'allergies'],
    patterns: [
      // Markdown format
      /\*\*\s*Alergias\s*\*\*\s*:?\s*(.+)/i,
      /\*\*\s*Registro\s*de\s*[Aa]lergias\s*\*\*\s*:?\s*(.+)/i,
      // Plain text format
      /alergias?\s*[:=]?\s*(.+)/i,
      /allergies?\s*[:=]?\s*(.+)/i,
      /NKDA/i,
      /niega\s*alergias/i,
      /sin\s*alergias\s*conocidas/i,
      /no\s*refiere\s*alergias/i,
    ],
  },
  {
    id: 'antecedentes',
    name: 'Antecedentes',
    description: 'Antecedentes médicos relevantes',
    priority: 'IMPORTANT',
    contentPaths: ['antecedentes', 'medical_history', 'history'],
    patterns: [
      // Markdown format
      /\*\*\s*Antecedentes\s*(M[ée]dicos)?\s*\*\*\s*:?\s*(.+)/i,
      /##\s*\d*\.?\s*Antecedentes\s*\n(.+)/i,
      /\*\*\s*Historia\s*Cl[íi]nica\s*\*\*\s*:?\s*(.+)/i,
      // Plain text format
      /antecedentes\s*(m[ée]dicos)?\s*[:=]?\s*(.+)/i,
      /historia\s*cl[íi]nica\s*[:=]?\s*(.+)/i,
      /padecimientos\s*previos\s*[:=]?\s*(.+)/i,
      /medical\s*history\s*[:=]?\s*(.+)/i,
      // Conversational: "su madre tuvo...", "mi padre falleció de..."
      /(?:su|mi)\s*(?:madre|padre|hermano|hermana)\s*(?:tuvo|tuvo|falleci[óo]|muri[óo]|tiene)\s*(.+)/i,
      /antecedentes\s*en\s*(?:su\s*)?familia/i,
    ],
  },
  {
    id: 'medicamentos_actuales',
    name: 'Medicamentos Actuales',
    description: 'Medicamentos que el paciente toma actualmente',
    priority: 'IMPORTANT',
    contentPaths: ['medicamentos_actuales', 'current_medications'],
    patterns: [
      // Markdown format
      /\*\*\s*Medicamentos?\s*[Aa]ctuales?\s*\*\*\s*:?\s*(.+)/i,
      /\*\*\s*Tratamiento\s*[Aa]ctual\s*\*\*\s*:?\s*(.+)/i,
      // Plain text format
      /medicamentos?\s*(actuales?)?\s*[:=]?\s*(.+)/i,
      /f[áa]rmacos?\s*(actuales?)?\s*[:=]?\s*(.+)/i,
      /current\s*medications?\s*[:=]?\s*(.+)/i,
      /toma\s*actualmente\s*[:=]?\s*(.+)/i,
      // Conversational: "para lo que sí tomo...", "tomo pastillas para..."
      /(?:para\s*lo\s*que\s*(?:s[íi]\s*)?)?tomo\s*(.+)/i,
      /(?:tomo|usa)\s*(?:pastillas?\s*)?(?:de|para)\s*(.+)/i,
    ],
  },
];

// ============================================
// CAMPOS CONDICIONALES (Dependen del contexto)
// ============================================

const CONDITIONAL_FIELDS: ComplianceField[] = [
  {
    id: 'resultados_laboratorio',
    name: 'Resultados de Laboratorio',
    description: 'Interpretación de resultados de laboratorio',
    priority: 'CONDITIONAL',
    appliesWhen: (ctx) => ctx.hasLabOrders === true,
    contentPaths: ['resultados_lab', 'lab_results', 'laboratorios'],
    patterns: [
      /resultados?\s*(de\s*)?(laboratorio|lab)\s*[:=]?\s*(.+)/i,
      /lab(oratorios?)?\s*[:=]?\s*(.+)/i,
      /estudios?\s*(de\s*laboratorio)?\s*[:=]?\s*(.+)/i,
    ],
  },
  {
    id: 'evolucion',
    name: 'Evolución',
    description: 'Evolución del paciente desde la última consulta',
    priority: 'CONDITIONAL',
    appliesWhen: (ctx) => ctx.isFollowUp === true,
    contentPaths: ['evolucion', 'evolution', 'progress'],
    patterns: [
      /evoluci[óo]n\s*[:=]?\s*(.+)/i,
      /progress\s*[:=]?\s*(.+)/i,
      /desde\s*(la\s*)?[úu]ltima\s*(consulta|visita)\s*[:=]?\s*(.+)/i,
    ],
  },
  {
    id: 'cuestionario_especialidad',
    name: 'Información de Cuestionario de Especialidad',
    description: 'Datos relevantes del cuestionario de especialidad completado',
    priority: 'CONDITIONAL',
    appliesWhen: (ctx) => ctx.specialtyQuestionsAnswered === true,
    contentPaths: ['cuestionario_especialidad', 'specialty_questionnaire'],
    patterns: [
      /cuestionario\s*(de\s*)?(especialidad)?\s*[:=]?\s*(.+)/i,
      /respuestas?\s*(de\s*)?especialidad\s*[:=]?\s*(.+)/i,
    ],
  },
  {
    id: 'codigo_icd',
    name: 'Código ICD-11',
    description: 'Código de diagnóstico ICD-11',
    priority: 'CONDITIONAL',
    appliesWhen: () => true, // Siempre recomendado pero no obligatorio
    contentPaths: ['icd_code', 'codigo_icd', 'icd11'],
    patterns: [
      /icd[\s-]?1[01]\s*[:=]?\s*([A-Z0-9.]+)/i,
      /c[óo]digo\s*(icd|cie)\s*[:=]?\s*([A-Z0-9.]+)/i,
      /cie[\s-]?1[01]\s*[:=]?\s*([A-Z0-9.]+)/i,
    ],
  },
];

// ============================================
// SCHEMA COMPLETO
// ============================================

export const COMPLIANCE_FIELDS_SCHEMA = {
  critical: CRITICAL_FIELDS,
  important: IMPORTANT_FIELDS,
  conditional: CONDITIONAL_FIELDS,

  getAllFields(): ComplianceField[] {
    return [...CRITICAL_FIELDS, ...IMPORTANT_FIELDS, ...CONDITIONAL_FIELDS];
  },

  getFieldById(id: string): ComplianceField | undefined {
    return this.getAllFields().find(f => f.id === id);
  },

  getFieldsByPriority(priority: FieldPriority): ComplianceField[] {
    switch (priority) {
      case 'CRITICAL': return CRITICAL_FIELDS;
      case 'IMPORTANT': return IMPORTANT_FIELDS;
      case 'CONDITIONAL': return CONDITIONAL_FIELDS;
    }
  },

  getApplicableFields(context: ComplianceContext): ComplianceField[] {
    return this.getAllFields().filter(field => {
      if (!field.appliesWhen) return true;
      return field.appliesWhen(context);
    });
  },
};

// ============================================
// FUNCIONES DE EVALUACIÓN
// ============================================

/**
 * Evalúa si un campo está presente en el contenido del reporte
 */
export function evaluateField(
  field: ComplianceField,
  reportContent: string,
  structuredData?: Record<string, unknown>
): ComplianceResult {
  // Primero buscar en datos estructurados
  if (structuredData) {
    for (const path of field.contentPaths) {
      const value = structuredData[path];
      if (value && String(value).trim().length > 0) {
        return {
          field,
          status: 'present',
          value: String(value),
        };
      }
    }
  }

  // Normalizar contenido para mejor detección
  // Remover saltos de línea múltiples y espacios extra para patrones multilinea
  const normalizedContent = reportContent
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  // Buscar con patrones en texto libre
  for (const pattern of field.patterns) {
    const match = normalizedContent.match(pattern);
    if (match) {
      // Obtener el valor capturado (primer grupo no vacío o último grupo)
      let value = '';
      for (let i = match.length - 1; i >= 1; i--) {
        if (match[i] && match[i].trim().length > 2) {
          value = match[i].trim();
          break;
        }
      }

      if (value && value.length > 2 && !value.includes('[Faltante]')) {
        return {
          field,
          status: 'present',
          value: value,
        };
      }
    }
  }

  // Búsqueda adicional por secciones de Markdown (##, ###)
  const sectionPatterns: Record<string, RegExp[]> = {
    motivo_consulta: [
      /##\s*\d*\.?\s*Motivo\s+de\s+Consulta\s*\n+([\s\S]*?)(?=\n##|\n###|$)/i,
      /\*\*\s*Motivo\s*(de\s*)?(la\s*)?Consulta\s*:?\*\*\s*[:\s]*([\s\S]*?)(?=\n\*\*|\n##|$)/i,
    ],
    diagnostico: [
      /##\s*\d*\.?\s*Diagn[óo]stico\s*\n+([\s\S]*?)(?=\n##|\n###|$)/i,
      /\*\*\s*Diagn[óo]stico[^*]*\*\*\s*:?\s*([\s\S]*?)(?=\n\*\*|\n##|$)/i,
      /\*\*\s*Impresi[óo]n\s*[Dd]iagn[óo]stica[^*]*\*\*\s*:?\s*([\s\S]*?)(?=\n\*\*|\n##|$)/i,
    ],
    signos_vitales: [
      /\*\*\s*(?:Signos?\s*[Vv]itales?|TA|Presi[óo]n)\s*[^*]*\*\*\s*:?\s*([\s\S]*?)(?=\n\*\*|\n##|$)/i,
      /\d{2,3}\s*(?:\/|sobre)\s*\d{2,3}/i,
    ],
    exploracion_fisica: [
      /##\s*\d*\.?\s*Exploraci[óo]n\s*F[íi]sica\s*\n+([\s\S]*?)(?=\n##|\n###|$)/i,
      /\*\*\s*(?:Exploraci[óo]n|Examen)\s*[Ff][íi]sic[oa][^*]*\*\*\s*:?\s*([\s\S]*?)(?=\n\*\*|\n##|$)/i,
    ],
    plan_tratamiento: [
      /##\s*\d*\.?\s*(?:Plan\s*de\s*)?Tratamiento\s*\n+([\s\S]*?)(?=\n##|\n###|$)/i,
      /\*\*\s*(?:Plan|Tratamiento)[^*]*\*\*\s*:?\s*([\s\S]*?)(?=\n\*\*|\n##|$)/i,
    ],
    seguimiento: [
      /##\s*\d*\.?\s*Seguimiento\s*\n+([\s\S]*?)(?=\n##|\n###|$)/i,
      /\*\*\s*(?:Seguimiento|Pr[óo]xima\s*[Cc]ita)[^*]*\*\*\s*:?\s*([\s\S]*?)(?=\n\*\*|\n##|$)/i,
      /ver\s*en\s*\d+\s*d[íi]as/i,
      /lo\s*quiero\s*ver\s*en/i,
    ],
    alergias: [
      /\*\*\s*(?:Alergias?|Registro\s*de\s*[Aa]lergias?)[^*]*\*\*\s*:?\s*([\s\S]*?)(?=\n\*\*|\n##|$)/i,
      /niega\s*alergias|NKDA|sin\s*alergias|no\s*refiere\s*alergias/i,
    ],
    antecedentes: [
      /##\s*\d*\.?\s*Antecedentes\s*\n+([\s\S]*?)(?=\n##|\n###|$)/i,
      /\*\*\s*Antecedentes[^*]*\*\*\s*:?\s*([\s\S]*?)(?=\n\*\*|\n##|$)/i,
    ],
    medicamentos_actuales: [
      /\*\*\s*Medicamentos?\s*[Aa]ctuales?[^*]*\*\*\s*:?\s*([\s\S]*?)(?=\n\*\*|\n##|$)/i,
      /toma\s+(?:actualmente\s+)?(?:losart[áa]n|metformina|enalapril|aspirina|omeprazol)/i,
    ],
  };

  const fieldPatterns = sectionPatterns[field.id];
  if (fieldPatterns) {
    for (const pattern of fieldPatterns) {
      const match = normalizedContent.match(pattern);
      if (match) {
        const value = match[1] || match[0];
        if (value && value.trim().length > 2 && !value.includes('[Faltante]')) {
          return {
            field,
            status: 'present',
            value: value.trim().substring(0, 200), // Limitar longitud
          };
        }
      }
    }
  }

  return {
    field,
    status: 'missing',
    suggestions: generateSuggestions(field),
  };
}

/**
 * Genera sugerencias para campos faltantes
 */
function generateSuggestions(field: ComplianceField): string[] {
  const suggestions: string[] = [];

  switch (field.id) {
    case 'motivo_consulta':
      suggestions.push('Agregar: "Motivo de consulta: [razón de la visita]"');
      break;
    case 'diagnostico':
      suggestions.push('Agregar: "Diagnóstico: [diagnóstico clínico]"');
      suggestions.push('Considerar incluir código ICD-11 si está disponible');
      break;
    case 'signos_vitales':
      suggestions.push('Agregar signos vitales: TA, FC, FR, Temperatura');
      break;
    case 'exploracion_fisica':
      suggestions.push('Agregar: "Exploración física: [hallazgos]"');
      break;
    case 'plan_tratamiento':
      suggestions.push('Agregar: "Plan de tratamiento: [indicaciones y medicamentos]"');
      break;
    case 'seguimiento':
      suggestions.push('Agregar: "Seguimiento: [indicaciones y próxima cita]"');
      break;
    case 'alergias':
      suggestions.push('Agregar: "Alergias: [lista o NKDA si no hay]"');
      break;
    case 'resultados_laboratorio':
      suggestions.push('Incluir interpretación de los resultados de laboratorio disponibles');
      break;
    default:
      suggestions.push(`Agregar información de: ${field.name}`);
  }

  return suggestions;
}

/**
 * Evalúa el cumplimiento completo de un reporte
 */
export function evaluateCompliance(
  reportId: string,
  reportContent: string,
  context: ComplianceContext,
  structuredData?: Record<string, unknown>
): ComplianceReport {
  const applicableFields = COMPLIANCE_FIELDS_SCHEMA.getApplicableFields(context);

  const results: ComplianceResult[] = applicableFields.map(field =>
    evaluateField(field, reportContent, structuredData)
  );

  const criticalMissing = results.filter(
    r => r.status === 'missing' && r.field.priority === 'CRITICAL'
  );
  const importantMissing = results.filter(
    r => r.status === 'missing' && r.field.priority === 'IMPORTANT'
  );
  const conditionalMissing = results.filter(
    r => r.status === 'missing' && r.field.priority === 'CONDITIONAL'
  );
  const presentFields = results.filter(r => r.status === 'present');

  // Calcular score
  const totalWeight = applicableFields.reduce((sum, f) => {
    if (f.priority === 'CRITICAL') return sum + 3;
    if (f.priority === 'IMPORTANT') return sum + 2;
    return sum + 1;
  }, 0);

  const achievedWeight = presentFields.reduce((sum, r) => {
    if (r.field.priority === 'CRITICAL') return sum + 3;
    if (r.field.priority === 'IMPORTANT') return sum + 2;
    return sum + 1;
  }, 0);

  const score = Math.round((achievedWeight / totalWeight) * 100);

  // Determinar estado general
  let overallStatus: ComplianceReport['overallStatus'];
  if (criticalMissing.length > 0) {
    overallStatus = 'critical_missing';
  } else if (importantMissing.length > 0) {
    overallStatus = 'needs_attention';
  } else {
    overallStatus = 'compliant';
  }

  return {
    reportId,
    evaluatedAt: new Date().toISOString(),
    overallStatus,
    criticalMissing,
    importantMissing,
    conditionalMissing,
    presentFields,
    score,
  };
}

/**
 * Formatea el resultado de cumplimiento para mostrar en UI
 */
export function formatComplianceForUI(report: ComplianceReport) {
  return {
    status: report.overallStatus,
    score: report.score,
    summary: {
      critical: {
        missing: report.criticalMissing.length,
        total: report.criticalMissing.length +
          report.presentFields.filter(r => r.field.priority === 'CRITICAL').length,
      },
      important: {
        missing: report.importantMissing.length,
        total: report.importantMissing.length +
          report.presentFields.filter(r => r.field.priority === 'IMPORTANT').length,
      },
      conditional: {
        missing: report.conditionalMissing.length,
        total: report.conditionalMissing.length +
          report.presentFields.filter(r => r.field.priority === 'CONDITIONAL').length,
      },
    },
    missingFields: [
      ...report.criticalMissing.map(r => ({
        ...r,
        priorityLabel: 'Crítico',
        priorityColor: 'red',
      })),
      ...report.importantMissing.map(r => ({
        ...r,
        priorityLabel: 'Importante',
        priorityColor: 'yellow',
      })),
      ...report.conditionalMissing.map(r => ({
        ...r,
        priorityLabel: 'Recomendado',
        priorityColor: 'blue',
      })),
    ],
  };
}
