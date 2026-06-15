'use client'

import { useState } from 'react'
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Plus, Loader2, Trash2, CalendarDays } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Room { id: string; name: string; type: string }
interface Professional { id: string; first_name: string; last_name: string; room_hourly_rate?: number | null }
interface Booking {
  id: string
  room_id: string
  professional_id: string
  start_time: string
  end_time: string
  hours_used: number
  status: string
  notes?: string | null
  billed: boolean
  room?: { name: string } | null
  professional?: { first_name: string; last_name: string; room_hourly_rate?: number | null } | null
}

const PROF_COLORS = [
  'bg-teal-100 text-teal-800 border-teal-300',
  'bg-blue-100 text-blue-800 border-blue-300',
  'bg-purple-100 text-purple-800 border-purple-300',
  'bg-amber-100 text-amber-800 border-amber-300',
  'bg-rose-100 text-rose-800 border-rose-300',
  'bg-indigo-100 text-indigo-800 border-indigo-300',
  'bg-emerald-100 text-emerald-800 border-emerald-300',
  'bg-orange-100 text-orange-800 border-orange-300',
]

interface Props {
  rooms: Room[]
  professionals: Professional[]
  bookings: Booking[]
}

export function RoomAgenda({ rooms, professionals, bookings: initialBookings }: Props) {
  const router = useRouter()
  const [bookings, setBookings] = useState(initialBookings)
  const [weekOffset, setWeekOffset] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    room_id: '',
    professional_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '09:00',
    end_time: '10:00',
    notes: '',
  })

  const baseWeek = addWeeks(new Date(), weekOffset)
  const weekStart = startOfWeek(baseWeek, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)) // Lun–Sab

  const profColorMap = new Map(professionals.map((p, i) => [p.id, PROF_COLORS[i % PROF_COLORS.length]]))

  function bookingsForRoomDay(roomId: string, day: Date) {
    return bookings.filter(b =>
      b.room_id === roomId &&
      b.status === 'confirmed' &&
      isSameDay(parseISO(b.start_time), day)
    ).sort((a, b) => a.start_time.localeCompare(b.start_time))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.room_id || !form.professional_id) { toast.error('Seleccioná consultorio y profesional'); return }
    setLoading(true)
    const supabase = createClient()
    const start = `${form.date}T${form.start_time}:00`
    const end = `${form.date}T${form.end_time}:00`
    if (end <= start) { toast.error('La hora de fin debe ser posterior al inicio'); setLoading(false); return }

    const { data, error } = await supabase.from('room_bookings').insert({
      room_id: form.room_id,
      professional_id: form.professional_id,
      start_time: start,
      end_time: end,
      notes: form.notes || null,
    }).select(`
      id, room_id, professional_id, start_time, end_time, hours_used,
      status, notes, billed, created_at,
      room:rooms(name),
      professional:professionals(first_name, last_name, room_hourly_rate)
    `).single()

    setLoading(false)
    if (error) {
      if (error.code === 'P0001' || error.message?.includes('exclusion') || error.message?.includes('overlap') || error.message?.includes('conflicto')) {
        toast.error('Ese consultorio ya está reservado en ese horario')
      } else {
        toast.error('Error al crear reserva: ' + error.message)
      }
      return
    }
    setBookings(prev => [data as unknown as Booking, ...prev])
    toast.success('Reserva creada')
    setOpen(false)
    setForm(f => ({ ...f, notes: '' }))
  }

  async function cancelBooking(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('room_bookings').update({ status: 'cancelled' }).eq('id', id)
    if (error) { toast.error('Error al cancelar'); return }
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b))
    toast.success('Reserva cancelada')
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[200px] text-center">
            {format(weekStart, "d 'de' MMMM", { locale: es })} — {format(addDays(weekStart, 5), "d 'de' MMMM yyyy", { locale: es })}
          </span>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)} className="text-teal-600">
            Hoy
          </Button>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="h-4 w-4 mr-2" />Nueva reserva
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {professionals.map(p => (
          <span key={p.id} className={`text-xs px-2 py-1 rounded-full border ${profColorMap.get(p.id)}`}>
            {p.last_name}, {p.first_name}
          </span>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[700px]">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 bg-gray-50 border border-gray-200 w-32 font-medium text-gray-600">Consultorio</th>
              {weekDays.map(day => (
                <th key={day.toISOString()} className={`px-2 py-2 border border-gray-200 font-medium text-center ${isSameDay(day, new Date()) ? 'bg-teal-50 text-teal-700' : 'bg-gray-50 text-gray-600'}`}>
                  <div className="capitalize">{format(day, 'EEE', { locale: es })}</div>
                  <div className={`text-lg font-bold ${isSameDay(day, new Date()) ? 'text-teal-600' : 'text-gray-800'}`}>{format(day, 'd')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rooms.map(room => (
              <tr key={room.id}>
                <td className="px-3 py-2 border border-gray-200 font-medium text-gray-700 bg-gray-50 align-top">
                  <div>{room.name}</div>
                  <div className="text-gray-400 font-normal capitalize">{room.type}</div>
                </td>
                {weekDays.map(day => {
                  const dayBookings = bookingsForRoomDay(room.id, day)
                  return (
                    <td key={day.toISOString()} className={`px-1 py-1 border border-gray-200 align-top min-w-[110px] ${isSameDay(day, new Date()) ? 'bg-teal-50/30' : 'bg-white'}`}>
                      {dayBookings.length === 0 ? (
                        <button
                          onClick={() => { setForm(f => ({ ...f, room_id: room.id, date: format(day, 'yyyy-MM-dd') })); setOpen(true) }}
                          className="w-full h-10 text-gray-300 hover:text-teal-500 hover:bg-teal-50 rounded transition-colors flex items-center justify-center"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      ) : (
                        <div className="space-y-1">
                          {dayBookings.map(b => (
                            <div key={b.id} className={`rounded border px-1.5 py-1 ${profColorMap.get(b.professional_id)} group relative`}>
                              <div className="font-medium truncate">
                                {b.professional?.last_name}
                              </div>
                              <div className="text-[10px] opacity-70">
                                {format(parseISO(b.start_time), 'HH:mm')}–{format(parseISO(b.end_time), 'HH:mm')}
                                {' '}({b.hours_used}h)
                              </div>
                              {b.billed && <div className="text-[10px] font-medium text-green-700">✓ Facturado</div>}
                              <button
                                onClick={() => cancelBooking(b.id)}
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                                title="Cancelar reserva"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {rooms.length === 0 && (
        <Card><CardContent className="p-8 text-center text-gray-400">
          <CalendarDays className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          No hay consultorios registrados. Creá uno primero en la pestaña Espacios.
        </CardContent></Card>
      )}

      {/* New booking dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nueva reserva de consultorio</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <Label>Consultorio *</Label>
              <Select value={form.room_id} onValueChange={v => setForm(f => ({ ...f, room_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {rooms.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Profesional *</Label>
              <Select value={form.professional_id} onValueChange={v => setForm(f => ({ ...f, professional_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {professionals.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.last_name}, {p.first_name}
                      {p.room_hourly_rate ? ` — $${p.room_hourly_rate}/h` : ' — sin tarifa'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Fecha *</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Hora inicio *</Label>
                <Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Hora fin *</Label>
                <Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Observaciones opcionales..." />
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reservar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
