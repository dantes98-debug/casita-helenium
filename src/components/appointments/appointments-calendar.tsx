'use client'

import { useState, useMemo } from 'react'
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { QuickSessionDialog } from './quick-session-dialog'
import Link from 'next/link'

interface Appointment {
  id: string
  start_time: string
  end_time: string
  status: string
  patient_id?: string
  patient?: { first_name: string; last_name: string } | null
  professional?: { first_name: string; last_name: string } | null
  professional_id?: string
}

interface Professional { id: string; first_name: string; last_name: string }

const PROF_COLORS = [
  { bg: 'bg-teal-100 border-teal-400', text: 'text-teal-800', dot: 'bg-teal-500' },
  { bg: 'bg-blue-100 border-blue-400', text: 'text-blue-800', dot: 'bg-blue-500' },
  { bg: 'bg-violet-100 border-violet-400', text: 'text-violet-800', dot: 'bg-violet-500' },
  { bg: 'bg-amber-100 border-amber-400', text: 'text-amber-800', dot: 'bg-amber-500' },
  { bg: 'bg-rose-100 border-rose-400', text: 'text-rose-800', dot: 'bg-rose-500' },
  { bg: 'bg-emerald-100 border-emerald-400', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  { bg: 'bg-orange-100 border-orange-400', text: 'text-orange-800', dot: 'bg-orange-500' },
  { bg: 'bg-indigo-100 border-indigo-400', text: 'text-indigo-800', dot: 'bg-indigo-500' },
]

const STATUS_OPACITY: Record<string, string> = {
  completed: 'opacity-60',
  no_show: 'opacity-40 line-through',
  cancelled_with_notice: 'opacity-30',
  cancelled_without_notice: 'opacity-30',
}

// Hour range: 8:00 to 21:00
const START_HOUR = 8
const END_HOUR = 21
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60
const SLOT_HEIGHT = 60 // px per hour

function timeToY(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return ((h - START_HOUR) * 60 + m) / TOTAL_MINUTES * (SLOT_HEIGHT * (END_HOUR - START_HOUR))
}

function dateToTime(date: Date): number {
  return ((date.getHours() - START_HOUR) * 60 + date.getMinutes()) / TOTAL_MINUTES * (SLOT_HEIGHT * (END_HOUR - START_HOUR))
}

function durationPx(start: Date, end: Date): number {
  const mins = (end.getTime() - start.getTime()) / 60000
  return Math.max(mins / TOTAL_MINUTES * (SLOT_HEIGHT * (END_HOUR - START_HOUR)), 24)
}

interface Props {
  appointments: Appointment[]
  professionals: Professional[]
  newAppointmentBase?: string
}

export function AppointmentsCalendar({ appointments, professionals, newAppointmentBase = '/appointments' }: Props) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [quickSession, setQuickSession] = useState<Appointment | null>(null)
  const [localAppts, setLocalAppts] = useState(appointments)

  const baseDate = addWeeks(new Date(), weekOffset)
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 })
  const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)) // Mon–Sat

  const profColorMap = useMemo(() =>
    new Map(professionals.map((p, i) => [p.id, PROF_COLORS[i % PROF_COLORS.length]])),
    [professionals]
  )

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
  const totalHeight = SLOT_HEIGHT * (END_HOUR - START_HOUR)

  function apptForDay(day: Date) {
    return localAppts.filter(a => {
      if (!a.start_time) return false
      return isSameDay(parseISO(a.start_time), day)
    })
  }

  function handleSessionDone(id: string, status: string) {
    setLocalAppts(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  // Current time indicator
  const now = new Date()
  const currentTimeY = dateToTime(now)
  const showCurrentTime = weekOffset === 0

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[220px] text-center">
            {format(weekStart, "d 'de' MMMM", { locale: es })} — {format(addDays(weekStart, 5), "d 'de' MMMM yyyy", { locale: es })}
          </span>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)} className="text-teal-600">Hoy</Button>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-2">
          {professionals.slice(0, 5).map(p => {
            const color = profColorMap.get(p.id)
            return (
              <span key={p.id} className={`text-xs px-2 py-0.5 rounded-full border ${color?.bg} ${color?.text}`}>
                {p.last_name}
              </span>
            )
          })}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <div className="min-w-[640px]">
          {/* Day headers */}
          <div className="grid border-b border-gray-200" style={{ gridTemplateColumns: '56px repeat(6, 1fr)' }}>
            <div className="border-r border-gray-100" />
            {days.map(day => (
              <div
                key={day.toISOString()}
                className={`text-center py-3 border-r last:border-r-0 border-gray-100 ${isSameDay(day, now) ? 'bg-teal-50' : ''}`}
              >
                <div className={`text-xs font-medium uppercase tracking-wider ${isSameDay(day, now) ? 'text-teal-600' : 'text-gray-400'}`}>
                  {format(day, 'EEE', { locale: es })}
                </div>
                <div className={`text-xl font-bold mt-0.5 ${isSameDay(day, now) ? 'text-teal-600' : 'text-gray-700'}`}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div className="relative flex" style={{ height: totalHeight }}>
            {/* Hour labels */}
            <div className="w-14 flex-shrink-0 border-r border-gray-100 relative">
              {hours.map(h => (
                <div
                  key={h}
                  className="absolute w-full text-right pr-2"
                  style={{ top: (h - START_HOUR) * SLOT_HEIGHT - 8 }}
                >
                  <span className="text-[10px] text-gray-400">{String(h).padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map(day => {
              const dayAppts = apptForDay(day)
              const isToday = isSameDay(day, now)
              return (
                <div
                  key={day.toISOString()}
                  className={`flex-1 relative border-r last:border-r-0 border-gray-100 ${isToday ? 'bg-teal-50/30' : ''}`}
                >
                  {/* Hour lines */}
                  {hours.map(h => (
                    <div
                      key={h}
                      className="absolute w-full border-t border-gray-100"
                      style={{ top: (h - START_HOUR) * SLOT_HEIGHT }}
                    />
                  ))}
                  {/* Half-hour lines */}
                  {hours.map(h => (
                    <div
                      key={h + 0.5}
                      className="absolute w-full border-t border-dashed border-gray-100"
                      style={{ top: (h - START_HOUR) * SLOT_HEIGHT + SLOT_HEIGHT / 2 }}
                    />
                  ))}

                  {/* Click to create */}
                  <Link
                    href={`${newAppointmentBase}/new?date=${format(day, 'yyyy-MM-dd')}`}
                    className="absolute inset-0 z-0 hover:bg-teal-50/50 transition-colors group"
                    title="Nuevo turno"
                  >
                    <Plus className="h-4 w-4 text-teal-400 opacity-0 group-hover:opacity-100 absolute top-2 right-2" />
                  </Link>

                  {/* Current time line */}
                  {isToday && showCurrentTime && (
                    <div
                      className="absolute left-0 right-0 z-20 pointer-events-none"
                      style={{ top: currentTimeY }}
                    >
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 flex-shrink-0" />
                        <div className="flex-1 h-px bg-red-400" />
                      </div>
                    </div>
                  )}

                  {/* Appointments */}
                  {dayAppts.map(appt => {
                    const start = parseISO(appt.start_time)
                    const end = appt.end_time ? parseISO(appt.end_time) : new Date(start.getTime() + 60 * 60000)
                    const top = dateToTime(start)
                    const height = durationPx(start, end)
                    const color = profColorMap.get(appt.professional_id ?? '') ?? PROF_COLORS[0]
                    const opacity = STATUS_OPACITY[appt.status] ?? ''
                    const isCancelled = appt.status.includes('cancelled')
                    const isDone = appt.status === 'completed' || appt.status === 'no_show'

                    return (
                      <div
                        key={appt.id}
                        className={`absolute left-1 right-1 z-10 rounded-lg border-l-2 px-1.5 py-1 cursor-pointer group transition-all hover:shadow-md ${color.bg} ${color.text} ${opacity}`}
                        style={{ top: top + 1, height: height - 2, overflow: 'hidden' }}
                        onClick={e => {
                          e.preventDefault()
                          if (!isCancelled && !isDone) setQuickSession(appt)
                        }}
                      >
                        <p className="text-[10px] font-bold leading-tight truncate">
                          {(appt.patient as any)?.last_name ?? 'Paciente'}
                        </p>
                        {height > 30 && (
                          <p className="text-[9px] opacity-70 truncate">
                            {format(start, 'HH:mm')}–{format(end, 'HH:mm')}
                          </p>
                        )}
                        {height > 44 && appt.professional && (
                          <p className="text-[9px] opacity-60 truncate">
                            {(appt.professional as any)?.last_name}
                          </p>
                        )}
                        {isDone && (
                          <div className="absolute top-1 right-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${appt.status === 'completed' ? 'bg-green-500' : 'bg-red-400'}`} />
                          </div>
                        )}
                        {!isDone && !isCancelled && (
                          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 rounded-lg transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <span className="text-[9px] font-medium bg-white/80 rounded px-1">Registrar</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Quick session dialog */}
      {quickSession && (
        <QuickSessionDialog
          open={!!quickSession}
          appointment={{
            id: quickSession.id,
            patient_id: quickSession.patient_id ?? '',
            patient_name: `${(quickSession.patient as any)?.last_name ?? ''}, ${(quickSession.patient as any)?.first_name ?? ''}`,
            professional_name: `${(quickSession.professional as any)?.last_name ?? ''}, ${(quickSession.professional as any)?.first_name ?? ''}`,
            start_time: quickSession.start_time,
          }}
          onClose={() => setQuickSession(null)}
          onDone={handleSessionDone}
        />
      )}
    </div>
  )
}
