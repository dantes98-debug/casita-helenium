'use client'

import { useState, useMemo } from 'react'
import { format, parseISO, isAfter, isBefore, isToday, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Clock, Building2, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NewAppointmentInBlockDialog } from './new-appointment-in-block-dialog'

interface Block {
  id: string
  professional_id: string
  room_id: string
  start_time: string
  end_time: string
  status: 'pending' | 'confirmed' | 'no_show'
  notes?: string | null
  room?: { id: string; name: string } | null
}

interface Appointment {
  id: string
  patient_id: string
  start_time: string
  end_time: string
  status: string
  patient?: { first_name: string; last_name: string } | null
}

interface Patient { id: string; first_name: string; last_name: string }
interface Professional { id: string; first_name: string; last_name: string; room_hourly_rate?: number | null }

interface Props {
  blocks: Block[]
  appointments: Appointment[]
  patients: Patient[]
  professional: Professional
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  confirmed: { label: 'Confirmado', color: 'bg-green-100 text-green-700 border-green-200' },
  no_show: { label: 'No asistí', color: 'bg-red-100 text-red-600 border-red-200' },
}

export function MyBlocksView({ blocks: initialBlocks, appointments, patients, professional }: Props) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [blocks] = useState(initialBlocks)
  const [newApptBlock, setNewApptBlock] = useState<Block | null>(null)
  const [localAppointments, setLocalAppointments] = useState(appointments)

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const blocksThisWeek = useMemo(() =>
    blocks.filter(b => days.some(d => isSameDay(parseISO(b.start_time), d)))
      .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [blocks, weekOffset]
  )

  function appointmentsInBlock(block: Block) {
    return localAppointments.filter(a =>
      isAfter(parseISO(a.start_time), parseISO(block.start_time)) ||
      isSameDay(parseISO(a.start_time), parseISO(block.start_time))
        ? parseISO(a.start_time) >= parseISO(block.start_time) && parseISO(a.start_time) < parseISO(block.end_time)
        : false
    )
  }

  function blockHours(block: Block) {
    return (new Date(block.end_time).getTime() - new Date(block.start_time).getTime()) / 3600000
  }

  function handleAppointmentCreated(appt: Appointment) {
    setLocalAppointments(prev => [...prev, appt])
  }

  // Group by day
  const byDay = useMemo(() => {
    const map = new Map<string, Block[]>()
    days.forEach(d => map.set(format(d, 'yyyy-MM-dd'), []))
    blocksThisWeek.forEach(b => {
      const key = format(parseISO(b.start_time), 'yyyy-MM-dd')
      const arr = map.get(key)
      if (arr) arr.push(b)
    })
    return map
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocksThisWeek])

  const hasBlocksThisWeek = blocksThisWeek.length > 0

  return (
    <div className="space-y-4">
      {/* Week nav */}
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
        <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)} className="text-teal-600">Esta semana</Button>
      </div>

      {!hasBlocksThisWeek ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center">
          <Building2 className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Sin bloques asignados esta semana</p>
          <p className="text-gray-400 text-sm mt-1">La coordinadora todavía no asignó horarios para esta semana</p>
        </div>
      ) : (
        <div className="space-y-3">
          {days.map(day => {
            const dayBlocks = byDay.get(format(day, 'yyyy-MM-dd')) ?? []
            if (dayBlocks.length === 0) return null
            return (
              <div key={day.toISOString()}>
                <h3 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${isToday(day) ? 'text-teal-700' : 'text-gray-600'}`}>
                  {isToday(day) && <span className="inline-block w-2 h-2 rounded-full bg-teal-500" />}
                  {format(day, "EEEE d 'de' MMMM", { locale: es })}
                </h3>
                <div className="space-y-2">
                  {dayBlocks.map(block => {
                    const appts = appointmentsInBlock(block)
                    const hours = blockHours(block)
                    const cost = professional.room_hourly_rate ? hours * professional.room_hourly_rate : null
                    const statusCfg = STATUS_LABEL[block.status]
                    const isPast = isBefore(parseISO(block.end_time), new Date())

                    return (
                      <div key={block.id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                        {/* Block header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                          <div className="flex items-center gap-3">
                            <Building2 className="h-4 w-4 text-teal-500 flex-shrink-0" />
                            <div>
                              <span className="font-semibold text-sm text-gray-800">{block.room?.name ?? 'Consultorio'}</span>
                              <span className="text-gray-400 text-sm ml-2">
                                {format(parseISO(block.start_time), 'HH:mm')} – {format(parseISO(block.end_time), 'HH:mm')}
                                <span className="ml-1 text-xs">({hours.toFixed(1)}h)</span>
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {cost !== null && (
                              <span className="text-xs text-gray-400">${cost.toLocaleString('es-AR')}</span>
                            )}
                            <Badge className={`text-xs border ${statusCfg.color}`}>{statusCfg.label}</Badge>
                          </div>
                        </div>

                        {/* Appointments inside block */}
                        <div className="px-4 py-3 space-y-2">
                          {appts.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-2">Sin turnos agendados en este bloque</p>
                          ) : (
                            appts
                              .sort((a, b) => a.start_time.localeCompare(b.start_time))
                              .map(appt => (
                                <div key={appt.id} className="flex items-center gap-3 rounded-lg bg-teal-50 border border-teal-100 px-3 py-2">
                                  <Clock className="h-3.5 w-3.5 text-teal-500 flex-shrink-0" />
                                  <span className="text-sm font-medium text-teal-800">
                                    {format(parseISO(appt.start_time), 'HH:mm')} – {format(parseISO(appt.end_time), 'HH:mm')}
                                  </span>
                                  <span className="text-sm text-gray-700 flex-1">
                                    {appt.patient ? `${appt.patient.first_name} ${appt.patient.last_name}` : 'Paciente'}
                                  </span>
                                </div>
                              ))
                          )}

                          {!isPast && block.status !== 'no_show' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full border-dashed text-teal-600 hover:bg-teal-50 hover:border-teal-300"
                              onClick={() => setNewApptBlock(block)}
                            >
                              <Plus className="h-3.5 w-3.5 mr-1.5" />Agendar turno en este bloque
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {newApptBlock && (
        <NewAppointmentInBlockDialog
          block={newApptBlock}
          patients={patients}
          professionalId={professional.id}
          onClose={() => setNewApptBlock(null)}
          onCreated={handleAppointmentCreated}
        />
      )}
    </div>
  )
}
