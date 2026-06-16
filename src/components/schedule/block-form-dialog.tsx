'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Room { id: string; name: string }
interface Professional { id: string; first_name: string; last_name: string; room_hourly_rate?: number | null }
interface ScheduleBlock {
  id: string
  professional_id: string
  room_id: string
  start_time: string
  end_time: string
  status: 'pending' | 'confirmed' | 'no_show'
  notes?: string | null
  professional?: { id: string; first_name: string; last_name: string } | null
  room?: { id: string; name: string } | null
}

interface Props {
  open: boolean
  onClose: () => void
  rooms: Room[]
  professionals: Professional[]
  editBlock: ScheduleBlock | null
  prefillRoomId?: string
  prefillDay?: Date
  onSaved: (block: ScheduleBlock) => void
  onDeleted: (id: string) => void
}

function toLocalDatetimeValue(iso: string) {
  const d = parseISO(iso)
  return format(d, "yyyy-MM-dd'T'HH:mm")
}

function toDatetimeValue(date: Date, timeStr: string) {
  return `${format(date, 'yyyy-MM-dd')}T${timeStr}`
}

export function BlockFormDialog({ open, onClose, rooms, professionals, editBlock, prefillRoomId, prefillDay, onSaved, onDeleted }: Props) {
  const [professionalId, setProfessionalId] = useState('')
  const [roomId, setRoomId] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [notes, setNotes] = useState('')
  const [repeatWeeks, setRepeatWeeks] = useState(0)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!open) return
    if (editBlock) {
      setProfessionalId(editBlock.professional_id)
      setRoomId(editBlock.room_id)
      setStartTime(toLocalDatetimeValue(editBlock.start_time))
      setEndTime(toLocalDatetimeValue(editBlock.end_time))
      setNotes(editBlock.notes ?? '')
      setRepeatWeeks(0)
    } else {
      setProfessionalId(professionals[0]?.id ?? '')
      setRoomId(prefillRoomId ?? rooms[0]?.id ?? '')
      const day = prefillDay ?? new Date()
      setStartTime(toDatetimeValue(day, '09:00'))
      setEndTime(toDatetimeValue(day, '13:00'))
      setNotes('')
      setRepeatWeeks(0)
    }
  }, [open, editBlock, prefillRoomId, prefillDay, professionals, rooms])

  async function handleSave() {
    if (!professionalId || !roomId || !startTime || !endTime) {
      toast.error('Completá todos los campos')
      return
    }
    if (new Date(startTime) >= new Date(endTime)) {
      toast.error('La hora de inicio debe ser antes que la de fin')
      return
    }
    setLoading(true)
    const supabase = createClient()

    if (editBlock) {
      const { data, error } = await supabase
        .from('schedule_blocks')
        .update({ professional_id: professionalId, room_id: roomId, start_time: new Date(startTime).toISOString(), end_time: new Date(endTime).toISOString(), notes: notes || null })
        .eq('id', editBlock.id)
        .select('*, professional:professionals(id, first_name, last_name), room:rooms(id, name)')
        .single()
      setLoading(false)
      if (error) { toast.error('Error al guardar: ' + error.message); return }
      onSaved(data as ScheduleBlock)
      toast.success('Bloque actualizado')
      onClose()
      return
    }

    // Create block(s) — repeat if needed
    const weeks = Math.max(0, Math.min(repeatWeeks, 12))
    const created: ScheduleBlock[] = []
    for (let w = 0; w <= weeks; w++) {
      const offsetMs = w * 7 * 24 * 60 * 60 * 1000
      const st = new Date(new Date(startTime).getTime() + offsetMs).toISOString()
      const et = new Date(new Date(endTime).getTime() + offsetMs).toISOString()
      const { data, error } = await supabase
        .from('schedule_blocks')
        .insert({ professional_id: professionalId, room_id: roomId, start_time: st, end_time: et, notes: notes || null })
        .select('*, professional:professionals(id, first_name, last_name), room:rooms(id, name)')
        .single()
      if (error) {
        toast.error(`Error en semana ${w + 1}: ${error.message}`)
        break
      }
      created.push(data as ScheduleBlock)
    }
    setLoading(false)
    created.forEach(b => onSaved(b))
    toast.success(created.length === 1 ? 'Bloque creado' : `${created.length} bloques creados`)
    onClose()
  }

  async function handleDelete() {
    if (!editBlock) return
    if (!confirm('¿Eliminar este bloque?')) return
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('schedule_blocks').delete().eq('id', editBlock.id)
    setDeleting(false)
    if (error) { toast.error('Error al eliminar'); return }
    onDeleted(editBlock.id)
    toast.success('Bloque eliminado')
    onClose()
  }

  const selectedProf = professionals.find(p => p.id === professionalId)
  const hoursCount = startTime && endTime ? Math.max(0, (new Date(endTime).getTime() - new Date(startTime).getTime()) / 3600000) : 0
  const costEstimate = selectedProf?.room_hourly_rate ? hoursCount * selectedProf.room_hourly_rate : null

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editBlock ? 'Editar bloque' : 'Nuevo bloque de consultorio'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Profesional</Label>
            <select
              value={professionalId}
              onChange={e => setProfessionalId(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {professionals.map(p => (
                <option key={p.id} value={p.id}>{p.last_name}, {p.first_name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label>Consultorio</Label>
            <select
              value={roomId}
              onChange={e => setRoomId(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {rooms.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Desde</Label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div className="space-y-1">
              <Label>Hasta</Label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          {hoursCount > 0 && (
            <div className="rounded-lg bg-teal-50 border border-teal-100 px-3 py-2 text-sm text-teal-700 flex justify-between">
              <span>{hoursCount.toFixed(1)} horas</span>
              {costEstimate !== null && (
                <span className="font-semibold">${costEstimate.toLocaleString('es-AR')} si se confirma</span>
              )}
            </div>
          )}

          {!editBlock && (
            <div className="space-y-1">
              <Label>Repetir este bloque</Label>
              <select
                value={repeatWeeks}
                onChange={e => setRepeatWeeks(Number(e.target.value))}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value={0}>Solo este día</option>
                <option value={1}>+ 1 semana más</option>
                <option value={2}>+ 2 semanas más</option>
                <option value={3}>+ 3 semanas más (1 mes)</option>
                <option value={7}>+ 7 semanas más (2 meses)</option>
                <option value={11}>+ 11 semanas más (3 meses)</option>
              </select>
            </div>
          )}

          <div className="space-y-1">
            <Label>Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej: solo por la mañana, consultorio compartido..."
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-1">
            {editBlock && (
              <Button variant="outline" className="text-red-500 hover:text-red-600 border-red-200" onClick={handleDelete} disabled={deleting}>
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            )}
            <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} disabled={loading} className="flex-1 bg-teal-600 hover:bg-teal-700">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editBlock ? 'Guardar cambios' : 'Crear bloque'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
