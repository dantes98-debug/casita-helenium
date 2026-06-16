'use client'

import { useState, useMemo } from 'react'
import { format, startOfWeek, addDays, addWeeks, subWeeks, parseISO, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Plus, Check, X, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { BlockFormDialog } from './block-form-dialog'

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

const PROF_COLORS = [
  { bg: 'bg-teal-100 border-teal-400 hover:bg-teal-200', text: 'text-teal-800', badge: 'bg-teal-500' },
  { bg: 'bg-blue-100 border-blue-400 hover:bg-blue-200', text: 'text-blue-800', badge: 'bg-blue-500' },
  { bg: 'bg-violet-100 border-violet-400 hover:bg-violet-200', text: 'text-violet-800', badge: 'bg-violet-500' },
  { bg: 'bg-amber-100 border-amber-400 hover:bg-amber-200', text: 'text-amber-800', badge: 'bg-amber-500' },
  { bg: 'bg-rose-100 border-rose-400 hover:bg-rose-200', text: 'text-rose-800', badge: 'bg-rose-500' },
  { bg: 'bg-emerald-100 border-emerald-400 hover:bg-emerald-200', text: 'text-emerald-800', badge: 'bg-emerald-500' },
]

const STATUS_ICON = {
  pending: <Clock className="h-3 w-3 opacity-60" />,
  confirmed: <Check className="h-3 w-3 text-green-600" />,
  no_show: <X className="h-3 w-3 text-red-500" />,
}

interface Props {
  rooms: Room[]
  professionals: Professional[]
  blocks: ScheduleBlock[]
}

export function ScheduleGrid({ rooms, professionals, blocks: initialBlocks }: Props) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [blocks, setBlocks] = useState(initialBlocks)
  const [formOpen, setFormOpen] = useState(false)
  const [editBlock, setEditBlock] = useState<ScheduleBlock | null>(null)
  const [prefill, setPrefill] = useState<{ roomId: string; day: Date } | null>(null)

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const profColorMap = useMemo(() =>
    new Map(professionals.map((p, i) => [p.id, PROF_COLORS[i % PROF_COLORS.length]])),
    [professionals]
  )

  function blocksForCell(roomId: string, day: Date) {
    return blocks.filter(b =>
      b.room_id === roomId && isSameDay(parseISO(b.start_time), day)
    ).sort((a, b) => a.start_time.localeCompare(b.start_time))
  }

  function handleCellClick(roomId: string, day: Date) {
    setPrefill({ roomId, day })
    setEditBlock(null)
    setFormOpen(true)
  }

  function handleBlockClick(block: ScheduleBlock, e: React.MouseEvent) {
    e.stopPropagation()
    setEditBlock(block)
    setPrefill(null)
    setFormOpen(true)
  }

  async function handleStatusChange(blockId: string, status: 'confirmed' | 'no_show' | 'pending', e: React.MouseEvent) {
    e.stopPropagation()
    const supabase = createClient()
    const { error } = await supabase.from('schedule_blocks').update({ status }).eq('id', blockId)
    if (error) { toast.error('Error al actualizar estado'); return }
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, status } : b))
    toast.success(status === 'confirmed' ? 'Bloque confirmado' : status === 'no_show' ? 'Marcado como ausente' : 'Pendiente')
  }

  function handleSaved(block: ScheduleBlock) {
    setBlocks(prev => {
      const exists = prev.find(b => b.id === block.id)
      if (exists) return prev.map(b => b.id === block.id ? block : b)
      return [...prev, block]
    })
  }

  function handleDeleted(blockId: string) {
    setBlocks(prev => prev.filter(b => b.id !== blockId))
  }

  // Occupancy stats per room for the week
  const roomOccupancy = useMemo(() => {
    const map = new Map<string, number>()
    blocks.forEach(b => {
      if (!days.some(d => isSameDay(parseISO(b.start_time), d))) return
      const hours = (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 3600000
      map.set(b.room_id, (map.get(b.room_id) ?? 0) + hours)
    })
    return map
  }, [blocks, days])

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[260px] text-center">
            {format(weekStart, "d 'de' MMMM", { locale: es })} — {format(addDays(weekStart, 6), "d 'de' MMMM yyyy", { locale: es })}
          </span>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)} className="text-teal-600">Hoy</Button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 items-center">
          {professionals.map(p => {
            const color = profColorMap.get(p.id)
            return (
              <span key={p.id} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${color?.bg} ${color?.text}`}>
                {p.last_name}
              </span>
            )
          })}
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 ml-2" onClick={() => { setEditBlock(null); setPrefill(null); setFormOpen(true) }}>
            <Plus className="h-3.5 w-3.5 mr-1" />Nuevo bloque
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full min-w-[700px] border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">
                Consultorio
              </th>
              {days.map(day => {
                const isToday = isSameDay(day, new Date())
                return (
                  <th key={day.toISOString()} className={`px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide ${isToday ? 'text-teal-700 bg-teal-50' : 'text-gray-500'}`}>
                    <div>{format(day, 'EEE', { locale: es })}</div>
                    <div className={`text-lg font-bold mt-0.5 ${isToday ? 'text-teal-700' : 'text-gray-800'}`}>
                      {format(day, 'd')}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rooms.map((room, roomIdx) => (
              <tr key={room.id} className={roomIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                <td className="px-4 py-3 border-r border-gray-100">
                  <div className="font-medium text-sm text-gray-800">{room.name}</div>
                  {roomOccupancy.get(room.id) ? (
                    <div className="text-xs text-gray-400 mt-0.5">{roomOccupancy.get(room.id)?.toFixed(1)}h esta semana</div>
                  ) : (
                    <div className="text-xs text-gray-300 mt-0.5">Sin bloques</div>
                  )}
                </td>
                {days.map(day => {
                  const cellBlocks = blocksForCell(room.id, day)
                  const isToday = isSameDay(day, new Date())
                  return (
                    <td
                      key={day.toISOString()}
                      className={`px-2 py-2 border-l border-gray-100 align-top cursor-pointer min-w-[110px] ${isToday ? 'bg-teal-50/30' : ''} hover:bg-gray-100/50 transition-colors`}
                      onClick={() => handleCellClick(room.id, day)}
                    >
                      <div className="space-y-1 min-h-[48px]">
                        {cellBlocks.map(block => {
                          const color = profColorMap.get(block.professional_id)
                          const startFmt = format(parseISO(block.start_time), 'HH:mm')
                          const endFmt = format(parseISO(block.end_time), 'HH:mm')
                          return (
                            <div
                              key={block.id}
                              className={`rounded-lg border px-2 py-1.5 text-xs cursor-pointer transition-all ${color?.bg} ${color?.text} ${block.status === 'no_show' ? 'opacity-40 line-through' : ''}`}
                              onClick={(e) => handleBlockClick(block, e)}
                            >
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <span className="font-semibold truncate">
                                  {block.professional?.last_name ?? '?'}
                                </span>
                                <span>{STATUS_ICON[block.status]}</span>
                              </div>
                              <div className="opacity-70">{startFmt} – {endFmt}</div>
                              {/* Quick action buttons */}
                              {block.status === 'pending' && (
                                <div className="flex gap-1 mt-1.5" onClick={e => e.stopPropagation()}>
                                  <button
                                    className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 rounded text-[10px] py-0.5 font-medium transition-colors"
                                    onClick={(e) => handleStatusChange(block.id, 'confirmed', e)}
                                  >✓ Fue</button>
                                  <button
                                    className="flex-1 bg-red-100 hover:bg-red-200 text-red-600 rounded text-[10px] py-0.5 font-medium transition-colors"
                                    onClick={(e) => handleStatusChange(block.id, 'no_show', e)}
                                  >✗ No fue</button>
                                </div>
                              )}
                              {block.status !== 'pending' && (
                                <button
                                  className="mt-1 text-[10px] opacity-50 hover:opacity-80"
                                  onClick={(e) => handleStatusChange(block.id, 'pending', e)}
                                >← deshacer</button>
                              )}
                            </div>
                          )
                        })}
                        {cellBlocks.length === 0 && (
                          <div className="flex items-center justify-center h-12 text-gray-300 hover:text-gray-400 transition-colors">
                            <Plus className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Status legend */}
      <div className="flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Pendiente</span>
        <span className="flex items-center gap-1"><Check className="h-3 w-3 text-green-600" /> Confirmado (se cobra)</span>
        <span className="flex items-center gap-1"><X className="h-3 w-3 text-red-500" /> No fue (no se cobra)</span>
      </div>

      <BlockFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        rooms={rooms}
        professionals={professionals}
        editBlock={editBlock}
        prefillRoomId={prefill?.roomId}
        prefillDay={prefill?.day}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    </div>
  )
}
