'use client'

import { useState } from 'react'
import { Admission } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Loader2, Edit, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'

type AdmissionRow = Admission & {
  professional?: { first_name: string; last_name: string } | null
}

const statusColors: Record<string, string> = {
  inquiry_received: 'bg-blue-100 text-blue-700', pending_response: 'bg-yellow-100 text-yellow-700',
  interview_scheduled: 'bg-purple-100 text-purple-700', in_evaluation: 'bg-orange-100 text-orange-700',
  waiting_list: 'bg-amber-100 text-amber-700', assigned: 'bg-teal-100 text-teal-700',
  in_treatment: 'bg-green-100 text-green-700', did_not_enter: 'bg-gray-100 text-gray-500',
  externally_referred: 'bg-indigo-100 text-indigo-700',
}
const statusLabels: Record<string, string> = {
  inquiry_received: 'Consulta recibida', pending_response: 'Pendiente resp.',
  interview_scheduled: 'Entrevista agendada', in_evaluation: 'En evaluación',
  waiting_list: 'Lista de espera', assigned: 'Asignado',
  in_treatment: 'En tratamiento', did_not_enter: 'No ingresó',
  externally_referred: 'Derivado ext.',
}

const admissionSchema = z.object({
  contact_date: z.string().min(1), patient_first_name: z.string().min(1, 'Nombre requerido'),
  patient_last_name: z.string().optional(), responsible_name: z.string().optional(),
  phone: z.string().min(1, 'Teléfono requerido'), reason_for_consultation: z.string().optional(),
  referral_source: z.string().optional(), suggested_professional_id: z.string().optional(),
  status: z.string().min(1).default('inquiry_received'), next_action: z.string().optional(),
  observations: z.string().optional(),
})
type FormData = z.infer<typeof admissionSchema>
type FormDataInput = Partial<FormData> & { contact_date: string; status: string }

interface Props {
  admissions: AdmissionRow[]
  professionals: { id: string; first_name: string; last_name: string }[]
}

export function AdmissionsView({ admissions: initial, professionals }: Props) {
  const [admissions, setAdmissions] = useState(initial)
  const [open, setOpen] = useState(false)
  const [editItem, setEditItem] = useState<AdmissionRow | null>(null)
  const [converting, setConverting] = useState<string | null>(null)
  const router = useRouter()

  async function handleConvertToPatient(admission: AdmissionRow) {
    setConverting(admission.id)
    const supabase = createClient()
    const { data: patient, error } = await supabase
      .from('patients')
      .insert({
        first_name: admission.patient_first_name,
        last_name: admission.patient_last_name ?? null,
        phone: admission.phone ?? null,
        primary_professional_id: admission.suggested_professional_id ?? null,
        status: 'active',
        admission_date: admission.contact_date,
        observations: admission.reason_for_consultation ?? null,
        patient_source: 'center',
      })
      .select('id')
      .single()
    if (error) { toast.error('Error al crear paciente: ' + error.message); setConverting(null); return }

    // Update admission status to in_treatment
    await supabase.from('admissions').update({ status: 'in_treatment' }).eq('id', admission.id)
    setAdmissions(prev => prev.map(a => a.id === admission.id ? { ...a, status: 'in_treatment' } : a))

    toast.success('Paciente creado correctamente')
    setConverting(null)
    router.push(`/patients/${patient.id}/edit`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(admissionSchema) as any,
    defaultValues: { contact_date: new Date().toISOString().split('T')[0], status: 'inquiry_received' },
  })

  function openNew() { reset({ contact_date: new Date().toISOString().split('T')[0], status: 'inquiry_received' }); setEditItem(null); setOpen(true) }

  async function onSubmit(data: FormData) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const clean = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v === '' ? null : v]))

    if (editItem) {
      const { error } = await supabase.from('admissions').update(clean).eq('id', editItem.id)
      if (error) { toast.error('Error al actualizar'); return }
      setAdmissions(prev => prev.map(a => a.id === editItem.id ? { ...a, ...clean } as AdmissionRow : a))
      toast.success('Admisión actualizada')
    } else {
      const { data: created, error } = await supabase.from('admissions').insert({ ...clean, created_by: user?.id }).select('*, professional:professionals(first_name, last_name)').single()
      if (error) { toast.error('Error al crear'); return }
      setAdmissions(prev => [created as AdmissionRow, ...prev])
      toast.success('Consulta registrada')
    }
    setOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew} className="bg-teal-600 hover:bg-teal-700"><Plus className="h-4 w-4 mr-2" />Nueva consulta</Button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {admissions.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-gray-400">Sin consultas registradas</CardContent></Card>
        ) : admissions.map(a => (
          <Card key={a.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{a.patient_last_name ? `${a.patient_last_name}, ` : ''}{a.patient_first_name}</span>
                    <Badge className={`text-xs ${statusColors[a.status]}`}>{statusLabels[a.status]}</Badge>
                  </div>
                  <div className="text-sm text-gray-600 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1">
                    <span><b>Tel:</b> {a.phone}</span>
                    <span><b>Fecha:</b> {format(new Date(a.contact_date), 'dd/MM/yyyy')}</span>
                    {a.referral_source && <span><b>Fuente:</b> {a.referral_source}</span>}
                    {a.professional && <span><b>Prof sugerido:</b> {a.professional.last_name}</span>}
                  </div>
                  {a.reason_for_consultation && <p className="text-sm text-gray-500 truncate">{a.reason_for_consultation}</p>}
                  {a.next_action && <p className="text-xs text-teal-600"><b>Próxima acción:</b> {a.next_action}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {(a.status === 'assigned' || a.status === 'interview_scheduled' || a.status === 'in_evaluation') && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-teal-600 border-teal-200 hover:bg-teal-50 text-xs"
                      onClick={() => handleConvertToPatient(a)}
                      disabled={converting === a.id}
                    >
                      {converting === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5 mr-1" />}
                      Crear paciente
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => { reset({ ...a, suggested_professional_id: a.suggested_professional_id ?? '' }); setEditItem(a); setOpen(true) }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? 'Editar consulta' : 'Nueva consulta'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nombre paciente *</Label>
                <Input {...register('patient_first_name')} />
                {errors.patient_first_name && <p className="text-xs text-red-500">{errors.patient_first_name.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Apellido</Label>
                <Input {...register('patient_last_name')} />
              </div>
              <div className="space-y-1">
                <Label>Responsable</Label>
                <Input {...register('responsible_name')} />
              </div>
              <div className="space-y-1">
                <Label>Teléfono *</Label>
                <Input {...register('phone')} />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Fecha de contacto</Label>
                <Input type="date" {...register('contact_date')} />
              </div>
              <div className="space-y-1">
                <Label>Fuente de derivación</Label>
                <Input {...register('referral_source')} placeholder="Red social, médico..." />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Motivo de consulta</Label>
                <Textarea {...register('reason_for_consultation')} rows={2} />
              </div>
              <div className="space-y-1">
                <Label>Profesional sugerido</Label>
                <Select value={watch('suggested_professional_id') ?? '__none__'} onValueChange={v => setValue('suggested_professional_id', v === '__none__' ? undefined : v)}>
                  <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin asignar</SelectItem>
                    {professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.last_name}, {p.first_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Select value={(watch('status') as any) ?? 'inquiry_received'} onValueChange={v => (setValue as any)('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Próxima acción</Label>
                <Input {...register('next_action')} placeholder="Ej: Llamar el martes para agendar entrevista" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Observaciones</Label>
                <Textarea {...register('observations')} rows={2} />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editItem ? 'Guardar' : 'Registrar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}


