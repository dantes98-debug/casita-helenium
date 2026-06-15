'use client'

import { useState } from 'react'
import { Room } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Edit, Loader2, Building2 } from 'lucide-react'

const roomSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  type: z.string().default('consultorio'),
  capacity: z.coerce.number().optional(),
  description: z.string().optional(),
  status: z.string().default('available'),
  hourly_rate: z.coerce.number().optional(),
  monthly_rate: z.coerce.number().optional(),
  observations: z.string().optional(),
})
type FormData = z.infer<typeof roomSchema>

const statusColors: Record<string, string> = {
  available: 'bg-green-100 text-green-700', occupied: 'bg-yellow-100 text-yellow-700',
  maintenance: 'bg-orange-100 text-orange-700', inactive: 'bg-gray-100 text-gray-500',
}
const statusLabels: Record<string, string> = {
  available: 'Disponible', occupied: 'Ocupado', maintenance: 'Mantenimiento', inactive: 'Inactivo',
}

export function RoomsView({ rooms: initialRooms }: { rooms: Room[] }) {
  const [rooms, setRooms] = useState(initialRooms)
  const [open, setOpen] = useState(false)
  const [editRoom, setEditRoom] = useState<Room | null>(null)
  const router = useRouter()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(roomSchema) as any,
    defaultValues: { status: 'available', type: 'consultorio' },
  })

  function openNew() { reset({ status: 'available', type: 'consultorio' }); setEditRoom(null); setOpen(true) }
  function openEdit(room: Room) {
    reset({ name: room.name, type: room.type, capacity: room.capacity ?? undefined, description: room.description ?? '', status: room.status, hourly_rate: room.hourly_rate ?? undefined, monthly_rate: room.monthly_rate ?? undefined, observations: room.observations ?? '' })
    setEditRoom(room); setOpen(true)
  }

  async function onSubmit(data: FormData) {
    const supabase = createClient()
    const payload = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v === '' ? null : v]))
    if (editRoom) {
      const { error } = await supabase.from('rooms').update(payload).eq('id', editRoom.id)
      if (error) { toast.error('Error al actualizar'); return }
      setRooms(prev => prev.map(r => r.id === editRoom.id ? { ...r, ...payload } as Room : r))
      toast.success('Consultorio actualizado')
    } else {
      const { data: created, error } = await supabase.from('rooms').insert(payload).select().single()
      if (error) { toast.error('Error al crear'); return }
      setRooms(prev => [...prev, created])
      toast.success('Consultorio creado')
    }
    setOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew} className="bg-teal-600 hover:bg-teal-700"><Plus className="h-4 w-4 mr-2" />Nuevo consultorio</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map(room => (
          <Card key={room.id} className="relative">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-teal-600" />
                  <h3 className="font-semibold">{room.name}</h3>
                </div>
                <Badge className={statusColors[room.status]}>{statusLabels[room.status]}</Badge>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>{room.type}{room.capacity ? ` · Cap. ${room.capacity}` : ''}</p>
                {room.description && <p className="text-gray-400 text-xs">{room.description}</p>}
                {room.hourly_rate && <p>Hora: <b>${room.hourly_rate}</b></p>}
                {room.monthly_rate && <p>Mensual: <b>${room.monthly_rate}</b></p>}
              </div>
              <Button variant="outline" size="sm" onClick={() => openEdit(room)} className="w-full">
                <Edit className="h-4 w-4 mr-1" />Editar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editRoom ? 'Editar consultorio' : 'Nuevo consultorio'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2">
                <Label>Nombre *</Label>
                <Input {...register('name')} placeholder="Consultorio 1, Sala de grupos..." />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Input {...register('type')} placeholder="consultorio, sala, etc." />
              </div>
              <div className="space-y-1">
                <Label>Capacidad</Label>
                <Input type="number" {...register('capacity')} />
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select value={watch('status')} onValueChange={v => setValue('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Disponible</SelectItem>
                    <SelectItem value="occupied">Ocupado</SelectItem>
                    <SelectItem value="maintenance">Mantenimiento</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Valor por hora</Label>
                <Input type="number" {...register('hourly_rate')} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label>Valor mensual</Label>
                <Input type="number" {...register('monthly_rate')} placeholder="0" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Descripción</Label>
                <Textarea {...register('description')} rows={2} />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editRoom ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

