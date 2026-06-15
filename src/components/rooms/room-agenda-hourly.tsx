'use client'

import { useState, useMemo } from 'react'
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Plus, Trash2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Room { id: string; name: string; type: string }
interface Professional { id: string; first_name: string; last_name: string; room_hourly_rate?: number | null }
interface Booking {
  id: string; room_id: string; professional_id: string
  start_time: string; end_time: string; hours_used: number
  status: string; notes?: string | null; billed: boolean
  room?: { name: string } | null
  professional?: { first_name: string; last_name: string } | null
}

const PROF_COLORS = [
  'bg-teal-100 border-teal-400 text-teal-800',
  'bg-blue-100 border-blue-400 text-blue-800',
  'bg-violet-100 border-violet-400 text-violet-800',
  'bg-amber-100 border-amber-400 text-amber-800',
  'bg-rose-100 border-rose-400 text-rose-800',
  'bg-emerald-100 border-emerald-400 text-emerald-800',
]

const START_HOUR = 8
const END_HOUR = 21
const SLOT_HEIGHT = 56

interface Props { rooms: Room[]; professionals: Professional[]; bookings: Booking[]; defaultProfessionalId?: string; lockProfessional?: boolean }

export function RoomAgendaHourly({ rooms, professionals, bookings: init, defaultProfessionalId, lockProfessional }: Props) {
  const router = useRouter()
  const [bookings, setBookings] = useState(init)
  const [weekOffset, setWeekOffset] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ room_id: '', professional_id: defaultProfessionalId ?? '', date: format(new Date(), 'yyyy-MM-dd'), start_time: '09:00', end_time: '10:00', notes: '' })

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 })
  const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i))
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
  const totalHeight = SLOT_HEIGHT * (END_HOUR - START_HOUR)
  const profColorMap = useMemo(() => new Map(professionals.map((p, i) => [p.id, PROF_COLORS[i % PROF_COLORS.length]])), [professionals])
  const now = new Date()

  function bookingsForRoomDay(roomId: string, day: Date) {
    return bookings.filter(b => b.room_id === roomId && b.status === 'confirmed' && isSameDay(parseISO(b.start_time), day))
  }

  function timeToY(timeStr: string) {
    const d = parseISO(timeStr)
    return ((d.getHours() - START_HOUR) * 60 + d.getMinutes()) / ((END_HOUR - START_HOUR) * 60) * totalHeight
  }

  function durationPx(start: string, end: string) {
    const mins = (parseISO(end).getTime() - parseISO(start).getTime()) / 60000
    return Math.max(mins / ((END_HOUR - START_HOUR) * 60) * totalHeight, 20)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.room_id || !form.professional_id) { toast.error('Seleccioná consultorio y profesional'); return }
    const start = new Date(`${form.date}T${form.start_time}:00`).toISOString()
    const end = new Date(`${form.date}T${form.end_time}:00`).toISOString()
    if (end <= start) { toast.error('La hora de fin debe ser posterior al inicio'); return }
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('room_bookings').insert({
      room_id: form.room_id, professional_id: form.professional_id,
      start_time: start, end_time: end, notes: form.notes || null,
    }).select(`id,room_id,professional_id,start_time,end_time,hours_used,status,notes,billed,room:rooms(name),professional:professionals(first_name,last_name,room_hourly_rate)`).single()
    setLoading(false)
    if (error) {
      if (error.message?.includes('exclusion') || error.message?.includes('overlap') || error.code === 'P0001') {
        toast.error('Ese consultorio ya está reservado en ese horario')
      } else {
        toast.error('Error: ' + error.message)
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

  function openNewBooking(roomId: string, day: Date, hour?: number) {
    setForm(f => ({
      ...f,
      room_id: roomId,
      professional_id: f.professional_id || defaultProfessionalId || '',
      date: format(day, 'yyyy-MM-dd'),
      start_time: hour !== undefined ? `${String(hour).padStart(2, '0')}:00` : f.start_time,
      end_time: hour !== undefined ? `${String(hour + 1).padStart(2, '0')}:00` : f.end_time,
    }))
    setOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-medium min-w-[220px] text-center">
            {format(weekStart, "d 'de' MMMM", { locale: es })} — {format(addDays(weekStart, 5), "d 'de' MMMM yyyy", { locale: es })}
          </span>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w + 1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)} className="text-teal-600">Hoy</Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {professionals.map(p => (
              <span key={p.id} className={`text-xs px-2 py-0.5 rounded-full border ${profColorMap.get(p.id)}`}>
                {p.last_name}
              </span>
            ))}
          </div>
          <Button onClick={() => setOpen(true)} className="bg-teal-600 hover:bg-teal-700">
            <Plus className="h-4 w-4 mr-2" />Nueva reserva
          </Button>
        </div>
      </div>

      {/* Grid per room */}
      {rooms.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No hay consultorios registrados.</div>
      ) : rooms.map(room => (
        <div key={room.id} className="rounded-xl border border-gray-200 overflow-hidden bg-white">
          {/* Room header */}
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-2">
            <span className="font-semibold text-gray-700">{room.name}</span>
            <span className="text-xs text-gray-400 capitalize">{room.type}</span>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Day headers */}
              <div className="grid border-b border-gray-200" style={{ gridTemplateColumns: '44px repeat(6, 1fr)' }}>
                <div className="border-r border-gray-100" />
                {days.map(day => (
                  <div key={day.toISOString()} className={`text-center py-2 border-r last:border-r-0 border-gray-100 text-xs ${isSameDay(day, now) ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-gray-500'}`}>
                    <span className="capitalize">{format(day, 'EEE d', { locale: es })}</span>
                  </div>
                ))}
              </div>

              {/* Time grid */}
              <div className="relative flex" style={{ height: totalHeight }}>
                {/* Hour labels */}
                <div className="w-11 flex-shrink-0 border-r border-gray-100 relative">
                  {hours.map(h => (
                    <div key={h} className="absolute w-full text-right pr-1.5" style={{ top: (h - START_HOUR) * SLOT_HEIGHT - 7 }}>
                      <span className="text-[10px] text-gray-400">{String(h).padStart(2, '0')}:00</span>
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {days.map(day => {
                  const dayBookings = bookingsForRoomDay(room.id, day)
                  const isToday = isSameDay(day, now)
                  return (
                    <div key={day.toISOString()} className={`flex-1 relative border-r last:border-r-0 border-gray-100 ${isToday ? 'bg-teal-50/20' : ''}`}>
                      {hours.map(h => (
                        <div key={h} className="absolute w-full" style={{ top: (h - START_HOUR) * SLOT_HEIGHT }}>
                          <div className="border-t border-gray-100 h-[28px] hover:bg-teal-50/50 cursor-pointer transition-colors"
                            onClick={() => openNewBooking(room.id, day, h)} title={`Reservar ${String(h).padStart(2,'0')}:00`} />
                          <div className="border-t border-dashed border-gray-100 h-[28px] hover:bg-teal-50/50 cursor-pointer transition-colors"
                            onClick={() => openNewBooking(room.id, day, h)} />
                        </div>
                      ))}

                      {isToday && weekOffset === 0 && (
                        <div className="absolute left-0 right-0 z-20 pointer-events-none"
                          style={{ top: ((now.getHours() - START_HOUR) * 60 + now.getMinutes()) / ((END_HOUR - START_HOUR) * 60) * totalHeight }}>
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 flex-shrink-0" />
                            <div className="flex-1 h-px bg-red-400" />
                          </div>
                        </div>
                      )}

                      {dayBookings.map(b => {
                        const top = timeToY(b.start_time)
                        const height = durationPx(b.start_time, b.end_time)
                        const color = profColorMap.get(b.professional_id) ?? PROF_COLORS[0]
                        return (
                          <div key={b.id}
                            className={`absolute left-0.5 right-0.5 z-10 rounded border-l-2 px-1.5 py-0.5 group ${color}`}
                            style={{ top: top + 1, height: height - 2, overflow: 'hidden' }}
                          >
                            <p className="text-[10px] font-bold truncate leading-tight">{b.professional?.first_name} {b.professional?.last_name}</p>
                            {height > 28 && (
                              <p className="text-[9px] opacity-70">
                                {format(parseISO(b.start_time), 'HH:mm')}–{format(parseISO(b.end_time), 'HH:mm')}
                              </p>
                            )}
                            {b.billed && height > 40 && <p className="text-[9px] text-green-700 font-medium">✓ Facturado</p>}
                            <button
                              onClick={() => cancelBooking(b.id)}
                              className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* New booking dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nueva reserva de consultorio</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Consultorio *</Label>
                <select value={form.room_id} onChange={e => setForm(f => ({ ...f, room_id: e.target.value }))}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500">
                  <option value="">Seleccionar...</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              {!lockProfessional && (
                <div className="space-y-1">
                  <Label>Profesional *</Label>
                  <select value={form.professional_id} onChange={e => setForm(f => ({ ...f, professional_id: e.target.value }))}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500">
                    <option value="">Seleccionar...</option>
                    {professionals.map(p => <option key={p.id} value={p.id}>{p.last_name}, {p.first_name}{p.room_hourly_rate ? ` ($${p.room_hourly_rate}/h)` : ''}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label>Fecha *</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Hora inicio *</Label><Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Hora fin *</Label><Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} /></div>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Observaciones opcionales..." />
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Reservar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
