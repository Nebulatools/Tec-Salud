'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Save, Send, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CreatePrescriptionSchema,
  type CreatePrescriptionType,
  COMMON_MEDICATIONS,
  FREQUENCY_OPTIONS,
  DURATION_OPTIONS,
} from '@/lib/schemas/prescription'

interface PrescriptionFormProps {
  patientId: string
  appointmentId?: string
  onSuccess?: (prescription: unknown) => void
  onCancel?: () => void
}

export function PrescriptionForm({
  patientId,
  appointmentId,
  onSuccess,
  onCancel,
}: PrescriptionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSigning, setIsSigning] = useState(false)

  const form = useForm<CreatePrescriptionType>({
    resolver: zodResolver(CreatePrescriptionSchema),
    defaultValues: {
      patient_id: patientId,
      appointment_id: appointmentId,
      medications: [
        {
          brand_name: '',
          generic_name: '',
          dosage: '',
          frequency: '',
          duration: '',
          instructions: '',
          quantity: '',
        },
      ],
      diagnosis: '',
      notes: '',
      valid_days: 30,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'medications',
  })

  const handleMedicationSelect = (index: number, medication: typeof COMMON_MEDICATIONS[0]) => {
    form.setValue(`medications.${index}.brand_name`, medication.brand)
    form.setValue(`medications.${index}.generic_name`, medication.generic)
    form.setValue(`medications.${index}.dosage`, medication.commonDosage)
  }

  async function onSubmit(data: CreatePrescriptionType, shouldSign = false) {
    if (shouldSign) {
      setIsSigning(true)
    } else {
      setIsSubmitting(true)
    }

    try {
      // Create prescription
      const response = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear receta')
      }

      const prescription = await response.json()

      // If signing, also sign the prescription
      if (shouldSign) {
        const signResponse = await fetch(`/api/prescriptions/${prescription.id}/sign`, {
          method: 'POST',
        })

        if (!signResponse.ok) {
          const error = await signResponse.json()
          throw new Error(error.error || 'Error al firmar receta')
        }

        const signedPrescription = await signResponse.json()
        onSuccess?.(signedPrescription)
      } else {
        onSuccess?.(prescription)
      }
    } catch (error) {
      console.error('Prescription error:', error)
      // You could add toast notification here
    } finally {
      setIsSubmitting(false)
      setIsSigning(false)
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-6">
        {/* Diagnosis */}
        <FormField
          control={form.control}
          name="diagnosis"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Diagnóstico</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Infección de vías respiratorias" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Medications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Medicamentos</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  brand_name: '',
                  generic_name: '',
                  dosage: '',
                  frequency: '',
                  duration: '',
                  instructions: '',
                  quantity: '',
                })
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar Medicamento
            </Button>
          </div>

          {fields.map((field, index) => (
            <Card key={field.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Medicamento {index + 1}</CardTitle>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <CardDescription>
                  <Select onValueChange={(value) => {
                    const med = COMMON_MEDICATIONS.find(m => m.brand === value)
                    if (med) handleMedicationSelect(index, med)
                  }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar medicamento común..." />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_MEDICATIONS.map((med) => (
                        <SelectItem key={med.brand} value={med.brand}>
                          {med.brand} ({med.generic}) - {med.commonDosage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`medications.${index}.brand_name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre Comercial</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Tempra" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`medications.${index}.generic_name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre Genérico</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Paracetamol" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name={`medications.${index}.dosage`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dosis</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: 500mg" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`medications.${index}.frequency`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frecuencia</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {FREQUENCY_OPTIONS.map((freq) => (
                              <SelectItem key={freq} value={freq}>
                                {freq}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`medications.${index}.duration`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duración</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DURATION_OPTIONS.map((dur) => (
                              <SelectItem key={dur} value={dur}>
                                {dur}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`medications.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cantidad</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: 30 tabletas" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`medications.${index}.instructions`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instrucciones</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Tomar con alimentos" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas Adicionales</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Indicaciones adicionales para el paciente..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Validity */}
        <FormField
          control={form.control}
          name="valid_days"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Validez (días)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex justify-end gap-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting || isSigning}
            onClick={form.handleSubmit((data) => onSubmit(data, false))}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar Borrador
              </>
            )}
          </Button>
          <Button
            type="button"
            disabled={isSubmitting || isSigning}
            onClick={form.handleSubmit((data) => onSubmit(data, true))}
          >
            {isSigning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Firmando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Firmar y Enviar
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
