'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { professionalSchema, ProfessionalFormData } from '@/lib/validations/professional'
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
import { Professional } from '@/types/database'

interface Props {
  professional?: Professional
}

export function ProfessionalForm({ professional }: Props) {
  const router = useRouter()
  const isEdit = !!professional

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<ProfessionalFormData>({
    resolver: zodResolver(professionalSchema) as any,
    defaultValues: professional ? {
      first_name: professional.first_name,
      last_name: professional.last_name,
      dni: professional.dni ?? '',
      cuit: professional.cuit ?? '',
      profession: professional.profession,
      specialty: professional.specialty ?? '',
      license_number: professional.license_number ?? '',
      phone: professional.phone ?? '',
      email: professional.email ?? '',
      address: professional.address ?? '',
      join_date: professional.join_date ?? '',
      status: professional.status,
      type: professional.type,
      area: professional.area ?? '',
      availability_notes: professional.availability_notes ?? '',
      observations: professional.observations ?? '',
    } : { status: 'active', type: 'internal' },
  })

  async function onSubmit(data: ProfessionalFormData) {
    const supabase = createClient()
    const cleanData = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
    )

    if (isEdit) {
      const { error } = await supabase.from('professionals').update(cleanData).eq('id', professional.id)
      if (error) { toast.error('Error al actualizar'); return }
      toast.success('Profesional actualizado')
    } else {
      const { error } = await supabase.from('professionals').insert(cleanData)
      if (error) { toast.error('Error al crear profesional'); return }
      toast.success('Profesional creado exitosamente')
    }
    router.push('/professionals')
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
            <Label>CUIT</Label>
            <Input {...register('cuit')} />
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
        <CardHeader><CardTitle className="text-base">Datos profesionales</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Profesión *</Label>
            <Input {...register('profession')} placeholder="Psicólogo, Psicopedagogo, etc." />
            {errors.profession && <p className="text-xs text-red-500">{errors.profession.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Especialidad</Label>
            <Input {...register('specialty')} />
          </div>
          <div className="space-y-1">
            <Label>Matrícula</Label>
            <Input {...register('license_number')} />
          </div>
          <div className="space-y-1">
            <Label>Área</Label>
            <Input {...register('area')} placeholder="Infancia, Adultos, Adolescencia..." />
          </div>
          <div className="space-y-1">
            <Label>Tipo *</Label>
            <Select value={watch('type')} onValueChange={v => setValue('type', v as ProfessionalFormData['type'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">Interno</SelectItem>
                <SelectItem value="external">Externo</SelectItem>
                <SelectItem value="mixed">Mixto</SelectItem>
                <SelectItem value="workshop">Tallerista</SelectItem>
                <SelectItem value="room_rental">Alquiler consultorio</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Estado</Label>
            <Select value={watch('status')} onValueChange={v => setValue('status', v as 'active' | 'inactive')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Fecha de ingreso</Label>
            <Input type="date" {...register('join_date')} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Disponibilidad horaria</Label>
            <Textarea {...register('availability_notes')} rows={2} placeholder="Ej: Lunes y miércoles 9-18hs" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Observaciones</Label>
            <Textarea {...register('observations')} rows={2} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? 'Guardar cambios' : 'Crear profesional'}
        </Button>
      </div>
    </form>
  )
}

