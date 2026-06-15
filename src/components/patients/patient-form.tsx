'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { patientSchema, PatientFormData } from '@/lib/validations/patient'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Plus, X, ChevronDown, ChevronUp, Users, MessageCircle } from 'lucide-react'
import { Patient } from '@/types/database'
import { useState } from 'react'

interface ResponsableForm {
  first_name: string
  last_name: string
  relationship: string
  phone: string
  email: string
  is_legal_guardian: boolean
  is_payment_responsible: boolean
}

interface Props {
  patient?: Patient
  professionals: { id: string; first_name: string; last_name: string; profession: string }[]
  defaultProfessionalId?: string
  lockProfessional?: boolean
}

const BLANK_RESP: ResponsableForm = { first_name: '', last_name: '', relationship: '', phone: '', email: '', is_legal_guardian: false, is_payment_responsible: false }

export function PatientForm({ patient, professionals, defaultProfessionalId, lockProfessional }: Props) {
  const router = useRouter()
  const isEdit = !!patient
  const [showResponsables, setShowResponsables] = useState(false)
  const [responsables, setResponsables] = useState<ResponsableForm[]>([])
  const [newResp, setNewResp] = useState<ResponsableForm>(BLANK_RESP)
  const [addingResp, setAddingResp] = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema) as any,
    defaultValues: patient ? {
      first_name: patient.first_name,
      last_name: patient.last_name,
      dni: patient.dni ?? '',
      birth_date: patient.birth_date ?? '',
      phone: patient.phone ?? '',
      email: patient.email ?? '',
      address: patient.address ?? '',
      health_insurance: patient.health_insurance ?? '',
      health_insurance_number: patient.health_insurance_number ?? '',
      diagnosis: patient.diagnosis ?? '',
      reason_for_consultation: patient.reason_for_consultation ?? '',
      primary_professional_id: patient.primary_professional_id ?? '',
      status: patient.status,
      referral_source: patient.referral_source ?? '',
      admission_date: patient.admission_date ?? '',
      observations: patient.observations ?? '',
      patient_source: (patient as any).patient_source ?? 'professional',
      school: (patient as any).school ?? '',
      school_grade: (patient as any).school_grade ?? '',
      school_shift: (patient as any).school_shift ?? '',
    } : { status: 'active', admission_date: new Date().toISOString().split('T')[0], patient_source: 'professional', primary_professional_id: defaultProfessionalId ?? '' },
  })

  async function onSubmit(data: PatientFormData) {
    const supabase = createClient()
    const cleanData = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
    )

    if (isEdit) {
      const { error } = await supabase.from('patients').update(cleanData).eq('id', patient.id)
      if (error) { toast.error('Error al actualizar'); return }
      toast.success('Paciente actualizado')
    } else {
      const { data: created, error } = await supabase.from('patients').insert(cleanData).select().single()
      if (error) { console.error('Patient insert error:', error); toast.error(`Error al crear paciente: ${error.message}`); return }
      // Auto-create clinical record
      const { error: crError } = await supabase.from('clinical_records').insert({ patient_id: created.id, reason_for_consultation: data.reason_for_consultation })
      if (crError) console.error('Clinical record error:', crError)
      // Save responsables if any were added
      if (responsables.length > 0) {
        await supabase.from('family_members').insert(
          responsables.map(r => ({ ...r, patient_id: created.id }))
        )
      }
      toast.success('Paciente creado exitosamente')
    }
    router.push('/patients')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Datos personales</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Nombre *</Label>
            <Input {...register('first_name')} />
            {errors.first_name && <p className="text-xs text-red-500">{errors.first_name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Apellido *</Label>
            <Input {...register('last_name')} />
            {errors.last_name && <p className="text-xs text-red-500">{errors.last_name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>DNI</Label>
            <Input {...register('dni')} />
          </div>
          <div className="space-y-1">
            <Label>Fecha de nacimiento</Label>
            <Input type="date" {...register('birth_date')} />
          </div>
          <div className="space-y-1">
            <Label>Teléfono</Label>
            <Input {...register('phone')} />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input type="email" {...register('email')} />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Dirección</Label>
            <Input {...register('address')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Obra social</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Obra social</Label>
            <Input {...register('health_insurance')} />
          </div>
          <div className="space-y-1">
            <Label>Número de afiliado</Label>
            <Input {...register('health_insurance_number')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Datos escolares</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1 sm:col-span-1">
            <Label>Escuela / Institución</Label>
            <Input {...register('school')} placeholder="Nombre del colegio..." />
          </div>
          <div className="space-y-1">
            <Label>Año / Grado</Label>
            <Input {...register('school_grade')} placeholder="1° primaria, 3° secundaria..." />
          </div>
          <div className="space-y-1">
            <Label>Turno</Label>
            <Select value={watch('school_shift') || '__none__'} onValueChange={v => setValue('school_shift' as any, v === '__none__' ? '' as any : v as any)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No aplica</SelectItem>
                <SelectItem value="morning">Mañana</SelectItem>
                <SelectItem value="afternoon">Tarde</SelectItem>
                <SelectItem value="full_day">Jornada completa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Datos clínicos</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1 sm:col-span-2">
            <Label>Motivo de consulta</Label>
            <Textarea {...register('reason_for_consultation')} rows={3} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Diagnóstico</Label>
            <Input {...register('diagnosis')} />
          </div>
          {!lockProfessional && <div className="space-y-1">
            <Label>Profesional principal</Label>
            <Select value={watch('primary_professional_id') ?? '__none__'} onValueChange={v => setValue('primary_professional_id', v === '__none__' ? undefined : v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin asignar</SelectItem>
                {professionals.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.last_name}, {p.first_name} ({p.profession})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>}
          <div className="space-y-1">
            <Label>Estado</Label>
            <Select value={watch('status')} onValueChange={v => setValue('status', v as PatientFormData['status'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="waiting_list">Lista de espera</SelectItem>
                <SelectItem value="paused">En pausa</SelectItem>
                <SelectItem value="discharged">Alta</SelectItem>
                <SelectItem value="referred">Derivado</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Origen del paciente *</Label>
            <Select value={watch('patient_source')} onValueChange={v => setValue('patient_source', v as 'center' | 'professional')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Paciente propio del profesional</SelectItem>
                <SelectItem value="center">Derivado por el centro</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">
              {watch('patient_source') === 'center'
                ? 'El centro aplica comisión sobre los cobros de este paciente.'
                : 'El profesional aporta este paciente. Solo se le cobra el uso del consultorio.'}
            </p>
          </div>
          <div className="space-y-1">
            <Label>Fuente de derivación</Label>
            <Input {...register('referral_source')} placeholder="Red social, médico, familiar..." />
          </div>
          <div className="space-y-1">
            <Label>Fecha de ingreso</Label>
            <Input type="date" {...register('admission_date')} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Observaciones</Label>
            <Textarea {...register('observations')} rows={2} />
          </div>
        </CardContent>
      </Card>

      {/* Responsables — sección opcional solo en creación */}
      {!isEdit && (
        <Card className="border-dashed border-gray-300">
          <CardContent className="p-0">
            <button
              type="button"
              onClick={() => setShowResponsables(s => !s)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <span className="flex items-center gap-2 font-medium">
                <Users className="h-4 w-4 text-teal-500" />
                Responsables / familia
                {responsables.length > 0 && (
                  <span className="bg-teal-100 text-teal-700 text-xs rounded-full px-2 py-0.5">{responsables.length}</span>
                )}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                {showResponsables ? <><ChevronUp className="h-4 w-4" />Ocultar</> : <><ChevronDown className="h-4 w-4" />Opcional — para pacientes con responsable externo</>}
              </span>
            </button>

            {showResponsables && (
              <div className="px-4 pb-4 space-y-3 border-t border-dashed border-gray-200 pt-3">
                {/* Lista de responsables ya agregados */}
                {responsables.map((r, i) => (
                  <div key={i} className="flex items-center justify-between bg-teal-50 rounded-lg px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium">{r.first_name} {r.last_name}</span>
                      <span className="text-gray-500 ml-2">· {r.relationship}</span>
                      {r.phone && <span className="text-gray-400 ml-2">{r.phone}</span>}
                    </div>
                    <button type="button" onClick={() => setResponsables(prev => prev.filter((_, j) => j !== i))}>
                      <X className="h-4 w-4 text-red-400 hover:text-red-600" />
                    </button>
                  </div>
                ))}

                {/* Form inline para agregar */}
                {addingResp ? (
                  <div className="border border-gray-200 rounded-lg p-3 space-y-3 bg-white">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Nombre *</Label>
                        <Input value={newResp.first_name} onChange={e => setNewResp(r => ({ ...r, first_name: e.target.value }))} placeholder="María" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Apellido *</Label>
                        <Input value={newResp.last_name} onChange={e => setNewResp(r => ({ ...r, last_name: e.target.value }))} placeholder="García" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Vínculo *</Label>
                        <select
                          value={newResp.relationship}
                          onChange={e => setNewResp(r => ({ ...r, relationship: e.target.value }))}
                          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                        >
                          <option value="">Seleccionar...</option>
                          <option>Madre</option>
                          <option>Padre</option>
                          <option>Tutor/a</option>
                          <option>Abuelo/a</option>
                          <option>Hermano/a</option>
                          <option>Tío/a</option>
                          <option>Cónyuge</option>
                          <option>Otro</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">WhatsApp</Label>
                        <div className="relative">
                          <MessageCircle className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-green-500" />
                          <Input value={newResp.phone} onChange={e => setNewResp(r => ({ ...r, phone: e.target.value }))} className="pl-8" placeholder="+54 9 11..." />
                        </div>
                      </div>
                      <div className="space-y-1 col-span-2">
                        <Label className="text-xs">Email (opcional)</Label>
                        <Input type="email" value={newResp.email} onChange={e => setNewResp(r => ({ ...r, email: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={newResp.is_legal_guardian} onChange={e => setNewResp(r => ({ ...r, is_legal_guardian: e.target.checked }))} className="rounded" />
                        Tutor legal
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={newResp.is_payment_responsible} onChange={e => setNewResp(r => ({ ...r, is_payment_responsible: e.target.checked }))} className="rounded" />
                        Resp. de pago
                      </label>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" size="sm" onClick={() => { setAddingResp(false); setNewResp(BLANK_RESP) }}>Cancelar</Button>
                      <Button
                        type="button" size="sm"
                        className="bg-teal-600 hover:bg-teal-700"
                        onClick={() => {
                          if (!newResp.first_name || !newResp.last_name || !newResp.relationship) { return }
                          setResponsables(prev => [...prev, newResp])
                          setNewResp(BLANK_RESP)
                          setAddingResp(false)
                        }}
                      >
                        Agregar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={() => setAddingResp(true)} className="w-full border-dashed">
                    <Plus className="h-3.5 w-3.5 mr-1" />Agregar responsable
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? 'Guardar cambios' : 'Crear paciente'}
        </Button>
      </div>
    </form>
  )
}



