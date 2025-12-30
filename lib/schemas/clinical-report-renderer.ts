/**
 * Clinical Report Markdown Renderer
 *
 * Renders ClinicalReportData to markdown format.
 * This is the ONLY place where markdown is generated.
 * No regex parsing needed - just template rendering.
 */

import type { ClinicalReportData, Medication, Diagnosis } from './clinical-report'

/**
 * Render a clinical report to markdown format
 */
export function renderClinicalReportToMarkdown(data: ClinicalReportData): string {
  const sections: string[] = []

  // Header
  sections.push(renderHeader(data))

  // Patient Info
  sections.push(renderPatientInfo(data))

  // Critical Fields
  sections.push(renderMotivoConsulta(data))
  sections.push(renderSignosVitales(data))
  sections.push(renderExploracionFisica(data))
  sections.push(renderDiagnosticos(data))

  // Important Fields
  sections.push(renderAntecedentes(data))
  sections.push(renderAlergias(data))
  sections.push(renderMedicamentosActuales(data))
  sections.push(renderPlanTratamiento(data))
  sections.push(renderSeguimiento(data))

  // Conditional Fields
  if (data.resultados_laboratorio?.length) {
    sections.push(renderResultadosLaboratorio(data))
  }
  if (data.evolucion) {
    sections.push(renderEvolucion(data))
  }

  // Additional Notes
  if (data.notas_adicionales) {
    sections.push(renderNotasAdicionales(data))
  }

  return sections.filter(Boolean).join('\n\n')
}

// ============================================
// SECTION RENDERERS
// ============================================

function renderHeader(data: ClinicalReportData): string {
  const lines = ['# Nota Médica', '']

  if (data.medico?.nombre) {
    lines.push(`*  **Nombre del médico tratante:** ${data.medico.nombre}`)
  }
  if (data.medico?.especialidad) {
    lines.push(`*  **Especialidad:** ${data.medico.especialidad}`)
  }
  if (data.medico?.cedula_profesional) {
    lines.push(`*  **Cédula profesional:** ${data.medico.cedula_profesional}`)
  }
  lines.push(`*  **Fecha y hora de consulta:** ${formatDate(data.consulta.fecha)}${data.consulta.hora ? ` ${data.consulta.hora}` : ''}`)

  return lines.join('\n')
}

function renderPatientInfo(data: ClinicalReportData): string {
  const lines = ['## 1. Datos del Paciente', '']

  lines.push(`*  **Nombre del paciente:** ${data.paciente.nombre}`)

  if (data.paciente.edad) {
    lines.push(`*  **Edad:** ${data.paciente.edad} años`)
  }
  if (data.paciente.sexo) {
    lines.push(`*  **Sexo:** ${data.paciente.sexo}`)
  }
  if (data.paciente.fecha_nacimiento) {
    lines.push(`*  **Fecha de nacimiento:** ${formatDate(data.paciente.fecha_nacimiento)}`)
  }

  return lines.join('\n')
}

function renderMotivoConsulta(data: ClinicalReportData): string {
  const lines = ['## 2. Motivo de Consulta', '']

  if (data.motivo_consulta) {
    lines.push(data.motivo_consulta)
  } else {
    lines.push('*[Faltante]*')
  }

  return lines.join('\n')
}

function renderSignosVitales(data: ClinicalReportData): string {
  const lines = ['## 3. Signos Vitales', '']
  const sv = data.signos_vitales

  if (!sv || !hasAnyVitalSign(sv)) {
    lines.push('*[Faltante]*')
    return lines.join('\n')
  }

  if (sv.presion_arterial?.raw) {
    lines.push(`*  **TA:** ${sv.presion_arterial.raw} mmHg`)
  } else if (sv.presion_arterial?.sistolica && sv.presion_arterial?.diastolica) {
    lines.push(`*  **TA:** ${sv.presion_arterial.sistolica}/${sv.presion_arterial.diastolica} mmHg`)
  }

  if (sv.frecuencia_cardiaca) {
    lines.push(`*  **FC:** ${sv.frecuencia_cardiaca} lpm`)
  }
  if (sv.frecuencia_respiratoria) {
    lines.push(`*  **FR:** ${sv.frecuencia_respiratoria} rpm`)
  }
  if (sv.temperatura) {
    lines.push(`*  **Temperatura:** ${sv.temperatura}°C`)
  }
  if (sv.saturacion_oxigeno) {
    lines.push(`*  **SpO2:** ${sv.saturacion_oxigeno}%`)
  }
  if (sv.peso) {
    lines.push(`*  **Peso:** ${sv.peso} kg`)
  }
  if (sv.talla) {
    lines.push(`*  **Talla:** ${sv.talla} cm`)
  }
  if (sv.imc) {
    lines.push(`*  **IMC:** ${sv.imc.toFixed(1)}`)
  }

  return lines.join('\n')
}

function hasAnyVitalSign(sv: ClinicalReportData['signos_vitales']): boolean {
  if (!sv) return false
  return !!(
    sv.presion_arterial?.raw ||
    sv.presion_arterial?.sistolica ||
    sv.frecuencia_cardiaca ||
    sv.frecuencia_respiratoria ||
    sv.temperatura ||
    sv.saturacion_oxigeno ||
    sv.peso ||
    sv.talla
  )
}

function renderExploracionFisica(data: ClinicalReportData): string {
  const lines = ['## 4. Exploración Física', '']

  if (data.exploracion_fisica) {
    lines.push(data.exploracion_fisica)
  } else {
    lines.push('*[Faltante]*')
  }

  return lines.join('\n')
}

function renderDiagnosticos(data: ClinicalReportData): string {
  const lines = ['## 5. Diagnóstico', '']

  if (!data.diagnosticos?.length) {
    lines.push('*[Faltante]*')
    return lines.join('\n')
  }

  data.diagnosticos.forEach((dx, i) => {
    const prefix = dx.tipo === 'principal' ? '**Diagnóstico principal:**' :
                   dx.tipo === 'secundario' ? 'Diagnóstico secundario:' :
                   'Diagnóstico diferencial:'

    let line = `${i + 1}. ${prefix} ${dx.descripcion}`
    if (dx.codigo_icd) {
      line += ` (${dx.codigo_icd})`
    }
    lines.push(line)
  })

  return lines.join('\n')
}

function renderAntecedentes(data: ClinicalReportData): string {
  const lines = ['## 6. Antecedentes', '']
  const ant = data.antecedentes

  if (!ant || !hasAnyAntecedente(ant)) {
    lines.push('*[Faltante]*')
    return lines.join('\n')
  }

  if (ant.personales_patologicos?.length) {
    lines.push('**Antecedentes personales patológicos:**')
    ant.personales_patologicos.forEach(a => lines.push(`- ${a}`))
    lines.push('')
  }

  if (ant.familiares?.length) {
    lines.push('**Antecedentes familiares:**')
    ant.familiares.forEach(a => lines.push(`- ${a}`))
    lines.push('')
  }

  if (ant.quirurgicos?.length) {
    lines.push('**Antecedentes quirúrgicos:**')
    ant.quirurgicos.forEach(a => lines.push(`- ${a}`))
    lines.push('')
  }

  if (ant.hospitalizaciones?.length) {
    lines.push('**Hospitalizaciones previas:**')
    ant.hospitalizaciones.forEach(a => lines.push(`- ${a}`))
  }

  return lines.join('\n')
}

function hasAnyAntecedente(ant: ClinicalReportData['antecedentes']): boolean {
  if (!ant) return false
  return !!(
    ant.personales_patologicos?.length ||
    ant.personales_no_patologicos?.length ||
    ant.familiares?.length ||
    ant.quirurgicos?.length ||
    ant.hospitalizaciones?.length
  )
}

function renderAlergias(data: ClinicalReportData): string {
  const lines = ['## 7. Alergias', '']
  const al = data.alergias

  if (!al) {
    lines.push('*[Faltante]*')
    return lines.join('\n')
  }

  if (al.nkda || (!al.tiene_alergias && !al.lista?.length)) {
    lines.push('Sin alergias conocidas (NKDA)')
  } else if (al.lista?.length) {
    al.lista.forEach(a => lines.push(`- ${a}`))
  } else {
    lines.push('*[Faltante]*')
  }

  return lines.join('\n')
}

function renderMedicamentosActuales(data: ClinicalReportData): string {
  const lines = ['## 8. Medicamentos Actuales', '']

  if (!data.medicamentos_actuales?.length) {
    lines.push('No refiere medicamentos actuales')
    return lines.join('\n')
  }

  data.medicamentos_actuales.forEach(med => {
    lines.push(`- ${formatMedication(med)}`)
  })

  return lines.join('\n')
}

function renderPlanTratamiento(data: ClinicalReportData): string {
  const lines = ['## 9. Plan de Tratamiento', '']
  const plan = data.plan_tratamiento

  if (!plan || !hasAnyTratamiento(plan)) {
    lines.push('*[Faltante]*')
    return lines.join('\n')
  }

  if (plan.medicamentos?.length) {
    lines.push('**Medicamentos prescritos:**')
    plan.medicamentos.forEach((med, i) => {
      lines.push(`${i + 1}. ${formatMedication(med)}`)
    })
    lines.push('')
  }

  if (plan.indicaciones_generales) {
    lines.push('**Indicaciones:**')
    lines.push(plan.indicaciones_generales)
    lines.push('')
  }

  if (plan.recomendaciones?.length) {
    lines.push('**Recomendaciones:**')
    plan.recomendaciones.forEach(r => lines.push(`- ${r}`))
  }

  return lines.join('\n')
}

function hasAnyTratamiento(plan: ClinicalReportData['plan_tratamiento']): boolean {
  if (!plan) return false
  return !!(
    plan.medicamentos?.length ||
    plan.indicaciones_generales ||
    plan.recomendaciones?.length
  )
}

function renderSeguimiento(data: ClinicalReportData): string {
  const lines = ['## 10. Seguimiento', '']
  const seg = data.seguimiento

  if (!seg || !hasAnySeguimiento(seg)) {
    lines.push('*[Faltante]*')
    return lines.join('\n')
  }

  if (seg.proxima_cita) {
    lines.push(`**Próxima cita:** ${seg.proxima_cita}`)
  }

  if (seg.indicaciones) {
    lines.push(`**Indicaciones:** ${seg.indicaciones}`)
  }

  if (seg.estudios_solicitados?.length) {
    lines.push('**Estudios solicitados:**')
    seg.estudios_solicitados.forEach(e => lines.push(`- ${e}`))
  }

  return lines.join('\n')
}

function hasAnySeguimiento(seg: ClinicalReportData['seguimiento']): boolean {
  if (!seg) return false
  return !!(seg.proxima_cita || seg.indicaciones || seg.estudios_solicitados?.length)
}

function renderResultadosLaboratorio(data: ClinicalReportData): string {
  const lines = ['## Resultados de Laboratorio', '']

  if (!data.resultados_laboratorio?.length) {
    return ''
  }

  data.resultados_laboratorio.forEach(lab => {
    let line = `- **${lab.estudio}:** `
    if (lab.resultado) {
      line += lab.resultado
    } else if (lab.valor !== undefined) {
      line += `${lab.valor}${lab.unidad ? ` ${lab.unidad}` : ''}`
    }
    if (lab.interpretacion) {
      line += ` - ${lab.interpretacion}`
    }
    lines.push(line)
  })

  return lines.join('\n')
}

function renderEvolucion(data: ClinicalReportData): string {
  if (!data.evolucion) return ''

  return [
    '## Evolución',
    '',
    data.evolucion,
  ].join('\n')
}

function renderNotasAdicionales(data: ClinicalReportData): string {
  if (!data.notas_adicionales) return ''

  return [
    '## Notas Adicionales',
    '',
    data.notas_adicionales,
  ].join('\n')
}

// ============================================
// HELPERS
// ============================================

function formatMedication(med: Medication): string {
  const parts = [med.nombre]

  if (med.dosis) parts.push(med.dosis)
  if (med.via) parts.push(`vía ${med.via}`)
  if (med.frecuencia) parts.push(med.frecuencia)
  if (med.duracion) parts.push(`por ${med.duracion}`)
  if (med.indicaciones) parts.push(`(${med.indicaciones})`)

  return parts.join(', ')
}

function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate)
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return isoDate
  }
}

// ============================================
// UPDATE STRUCTURED DATA FROM FIELD RESPONSE
// ============================================

/**
 * Update a specific field in ClinicalReportData based on fieldId
 * Returns a new object with the updated field
 */
export function updateFieldInReport(
  data: ClinicalReportData,
  fieldId: string,
  value: string
): ClinicalReportData {
  const updated = { ...data }

  switch (fieldId) {
    case 'motivo_consulta':
      updated.motivo_consulta = value
      break

    case 'signos_vitales':
      // Parse blood pressure if provided as "120/80"
      const bpMatch = value.match(/(\d{2,3})\s*[\/sobre]+\s*(\d{2,3})/)
      if (bpMatch) {
        updated.signos_vitales = {
          ...updated.signos_vitales,
          presion_arterial: {
            sistolica: parseInt(bpMatch[1]),
            diastolica: parseInt(bpMatch[2]),
            raw: `${bpMatch[1]}/${bpMatch[2]}`,
          },
        }
      } else {
        // Try to parse as general vital signs text
        updated.signos_vitales = {
          ...updated.signos_vitales,
          // Store raw value for now
        }
      }
      break

    case 'exploracion_fisica':
      updated.exploracion_fisica = value
      break

    case 'diagnostico':
      // Add as primary diagnosis if not already present
      const existingDx = updated.diagnosticos?.find(d => d.descripcion === value)
      if (!existingDx) {
        updated.diagnosticos = [
          ...(updated.diagnosticos || []),
          { descripcion: value, tipo: 'principal' },
        ]
      }
      break

    case 'plan_tratamiento':
      updated.plan_tratamiento = {
        ...updated.plan_tratamiento,
        indicaciones_generales: value,
      }
      break

    case 'seguimiento':
      updated.seguimiento = {
        ...updated.seguimiento,
        proxima_cita: value,
      }
      break

    case 'alergias':
      const isNegative = /no|niega|nkda|sin\s*alergias/i.test(value)
      updated.alergias = isNegative
        ? { tiene_alergias: false, nkda: true }
        : { tiene_alergias: true, nkda: false, lista: [value] }
      break

    case 'antecedentes':
      updated.antecedentes = {
        ...updated.antecedentes,
        personales_patologicos: [
          ...(updated.antecedentes?.personales_patologicos || []),
          value,
        ],
      }
      break

    case 'medicamentos_actuales':
      updated.medicamentos_actuales = [
        ...(updated.medicamentos_actuales || []),
        { nombre: value },
      ]
      break

    case 'evolucion':
      updated.evolucion = value
      break

    case 'resultados_laboratorio':
      updated.resultados_laboratorio = [
        ...(updated.resultados_laboratorio || []),
        { estudio: 'Resultados', resultado: value },
      ]
      break

    default:
      console.warn(`Unknown fieldId: ${fieldId}`)
  }

  return updated
}
