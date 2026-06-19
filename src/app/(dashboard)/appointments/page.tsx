import { createClient } from '@/lib/supabase/server'
import { AppointmentsView } from '@/components/appointments/appointments-view'
import { AppointmentsCalendar } from '@/components/appointments/appointments-calendar'
import { RoomAgendaHourly } from '@/components/rooms/room-agenda-hourly'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { Plus, List, CalendarDays, Building2 } from 'lucide-react'
import { startOfWeek, endOfWeek, addWeeks } from 'date-fns'

export default async function AppointmentsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const isProfessional = profile?.role === 'professional'

  // If professional, find their professional record for filtering
  let professionalId: string | null = null
  if (isProfessional) {
    let { data: prof } = await supabase
      .from('professionals')
      .select('id')
      .eq('user_id', user!.id)
      .maybeSingle()
    if (!prof && user?.email) {
      const { data: byEmail } = await supabase
        .from('professionals')
        .select('id')
        .eq('email', user.email)
        .maybeSingle()
      prof = byEmail
    }
    professionalId = prof?.id ?? null
  }

  const today = new Date()
  const calStart = startOfWeek(addWeeks(today, -1), { weekStartsOn: 1 }).toISOString()
  const calEnd = endOfWeek(addWeeks(today, 2), { weekStartsOn: 1 }).toISOString()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59).toISOString()

  let listQuery = supabase
    .from('appointments')
    .select(`*, patient:patients(first_name, last_name), professional:professionals(first_name, last_name), room:rooms(name)`)
    .gte('start_time', monthStart).lte('start_time', monthEnd)
    .order('start_time')

  let calQuery = supabase
    .from('appointments')
    .select(`id, start_time, end_time, status, patient_id, professional_id, patient:patients(first_name, last_name), professional:professionals(first_name, last_name)`)
    .gte('start_time', calStart).lte('start_time', calEnd)
    .not('status', 'in', '("cancelled_with_notice","cancelled_without_notice")')
    .order('start_time')

  if (isProfessional && professionalId) {
    listQuery = listQuery.eq('professional_id', professionalId) as any
    calQuery = calQuery.eq('professional_id', professionalId) as any
  }

  const [{ data: appointments }, { data: calAppointments }, { data: professionals }, { data: patients }, { data: rooms }, { data: allRooms }, { data: roomBookings }] = await Promise.all([
    listQuery,
    calQuery,
    supabase.from('professionals').select('id, first_name, last_name, room_hourly_rate').eq('status', 'active').is('deleted_at', null),
    supabase.from('patients').select('id, first_name, last_name').eq('status', 'active').is('deleted_at', null),
    supabase.from('rooms').select('id, name').eq('status', 'available'),
    supabase.from('rooms').select('*').order('name'),
    supabase.from('room_bookings')
      .select('id, room_id, professional_id, start_time, end_time, hours_used, status, notes, billed, room:rooms(name), professional:professionals(first_name, last_name, room_hourly_rate)')
      .order('start_time', { ascending: false }).limit(300),
  ])

  // For professional view, only show their own professional record in the calendar filter
  const calProfessionals = isProfessional && professionalId
    ? (professionals ?? []).filter(p => p.id === professionalId)
    : professionals ?? []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-gray-500 text-sm">
            {isProfessional ? 'Tus turnos' : 'Gestión de turnos y disponibilidad'}
          </p>
        </div>
        <Button asChild className="bg-teal-600 hover:bg-teal-700">
          <Link href="/appointments/new"><Plus className="h-4 w-4 mr-2" />Nuevo turno</Link>
        </Button>
      </div>

      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar" className="gap-2"><CalendarDays className="h-4 w-4" />Calendario</TabsTrigger>
          {!isProfessional && (
            <TabsTrigger value="rooms" className="gap-2"><Building2 className="h-4 w-4" />Consultorios</TabsTrigger>
          )}
          <TabsTrigger value="list" className="gap-2"><List className="h-4 w-4" />Lista</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-4">
          <AppointmentsCalendar
            appointments={(calAppointments as any) ?? []}
            professionals={calProfessionals}
          />
        </TabsContent>

        {!isProfessional && (
          <TabsContent value="rooms" className="mt-4">
            <RoomAgendaHourly
              rooms={allRooms ?? []}
              professionals={professionals ?? []}
              bookings={(roomBookings as any) ?? []}
            />
          </TabsContent>
        )}

        <TabsContent value="list" className="mt-4">
          <AppointmentsView
            appointments={appointments ?? []}
            professionals={professionals ?? []}
            patients={patients ?? []}
            rooms={rooms ?? []}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
