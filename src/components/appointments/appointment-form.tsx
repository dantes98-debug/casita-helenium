'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

const appointmentSchema = z.object({
  patient_id: z.string().uuid('Paciente requerido'),
  professional_id: z.string().uuid('Profesional requerido'),
  room_id: z.string().optional(),
  start_date: z.string().min(1, 'Fecha requerida'),
  start_time: z.string().min(1, 'Hora de inicio requerida'),
  end_time: z.string().min(1, 'Hora de fin requerida'),
  value: z.coerce.number().optional(),
  payment_method: z.string().optional(),
  payment_status: z.string().default('pending'),
  admin_notes: z.string().optional(),
})

type FormData = z.infer<typeof appointmentSchema>

interface Props {
  professionals: { id: string; first_name: string; last_name: string; profession: string }[]
  patients: { id: string; first_name: string; last_name: string }[]
  rooms: { id: string; name: string }[]
  defaultPatientId?: string
  defaultProfessionalId?: string
  lockProfessional?: boolean
  hidePay?: boolean
  appointment?: { id: string } & Partial<FormData>
  defaultDate?: string
  defaultHour?: string
  redirectAfter?: string
}

export function AppointmentForm({ professionals, patients, rooms, defaultPatientId, defaultProfessionalId, lockProfessional, hidePay, appointment, defaultDate, defaultHour, redirectAfter }: Props) {
  const router = useRouter()
  const isEdit = !!appointment

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(appointmentSchema) as any,
    defaultValues: appointment ? appointment as FormData : {
      patient_id: defaultPatientId ?? '',
      professional_id: defaultProfessionalId ?? '',
      payment_status: 'pending',
      start_date: defaultDate ?? new Date().toISOString().split('T')[0],
      start_time: defaultHour ?? '09:00',
      end_time: defaultHour ? `${String(Number(defaultHour.split(':')[0]) + 1).padStart(2,'0')}:00` : '10:00',
    },
  })

  async function onSubmit(data: FormData) {
    const supabase = createClient()
    const startTime = new Date(`${data.start_date}T${data.start_time}:00`)
    const endTime = new Date(`${data.start_date}T${data.end_time}:00`)

    if (endTime <= startTime) {
      toast.error('La hora de fin debe ser posterior al inicio')
      return
    }

    const payload = {
      patient_id: data.patient_id,
      professional_id: data.professional_id,
      room_id: data.room_id || null,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      value: data.value || null,
      payment_method: data.payment_method || null,
      payment_status: data.payment_status,
      admin_notes: data.admin_notes || null,
      status: 'reserved',
    }

    if (isEdit) {
      const { error } = await supabase.from('appointments').update(payload).eq('id', appointment.id)
      if (error) { toast.error(`Error: ${error.message}`); return }
      toast.success('Turno actualizado')
    } else {
      const { error } = await supabase.from('appointments').insert(payload)
      if (error) {
        if (error.message.includes('no_overlap')) toast.error('Conflicto de horario: el profesional ya tiene un turno en ese horario')
        else toast.error(`Error: ${error.message}`)
        return
      }
      toast.success('Turno creado exitosamente')
    }
    router.push(redirectAfter ?? '/appointments')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Datos del turno</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1 sm:col-span-2">
            <Label>Paciente *</Label>
            <Select value={watch('patient_id')} onValueChange={v => setValue('patient_id', v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar paciente..." /></SelectTrigger>
              <SelectContent>
                {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.last_name}, {p.first_name}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.patient_id && <p className="text-xs text-red-500">{errors.patient_id.message}</p>}
          </div>
          {!lockProfessional && (
            <div className="space-y-1 sm:col-span-2">
              <Label>Profesional *</Label>
              <Select value={watch('professional_id')} onValueChange={v => setValue('professional_id', v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar profesional..." /></SelectTrigger>
                <SelectContent>
                  {professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.last_name}, {p.first_name} ({p.profession})</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.professional_id && <p className="text-xs text-red-500">{errors.professional_id.message}</p>}
            </div>
          )}
          <div className="space-y-1">
            <Label>Consultorio</Label>
            <Select value={watch('room_id') ?? '__none__'} onValueChange={v => setValue('room_id', v === '__none__' ? undefined : v)}>
              <SelectTrigger><SelectValue placeholder="Sin consultorio" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin consultorio</SelectItem>
                {rooms.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Fecha *</Label>
            <Input type="date" {...register('start_date')} />
            {errors.start_date && <p className="text-xs text-red-500">{errors.start_date.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Hora inicio *</Label>
            <Input type="time" {...register('start_time')} />
            {errors.start_time && <p className="text-xs text-red-500">{errors.start_time.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Hora fin *</Label>
            <Input type="time" {...register('end_time')} />
            {errors.end_time && <p className="text-xs text-red-500">{errors.end_time.message}</p>}
          </div>
        </CardContent>
      </Card>

      {!hidePay && (
        <Card>
          <CardHeader><CardTitle className="text-base">Pago</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Valor de sesión</Label>
              <Input type="number" {...register('value')} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label>Medio de pago</Label>
              <Select value={watch('payment_method') ?? ''} onValueChange={v => setValue('payment_method', v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                  <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                  <SelectItem value="debit">Débito</SelectItem>
                  <SelectItem value="credit">Crédito</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Estado de pago</Label>
              <Select value={watch('payment_status')} onValueChange={v => setValue('payment_status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="paid">Pagado</SelectItem>
                  <SelectItem value="partial">Parcial</SelectItem>
                  <SelectItem value="discounted">Bonificado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Notas</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1">
            <Label>Observaciones administrativas</Label>
            <Textarea {...register('admin_notes')} rows={2} placeholder="Notas internas, recordatorios..." />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? 'Guardar cambios' : 'Crear turno'}
        </Button>
      </div>
    </form>
  )
}



