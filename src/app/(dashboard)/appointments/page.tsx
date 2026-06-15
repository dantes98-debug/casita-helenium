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

  const today = new Date()
  // Fetch 3 weeks for the calendar view (previous + current + next)
  const calStart = startOfWeek(addWeeks(today, -1), { weekStartsOn: 1 }).toISOString()
  const calEnd = endOfWeek(addWeeks(today, 2), { weekStartsOn: 1 }).toISOString()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59).toISOString()

  const [{ data: appointments }, { data: calAppointments }, { data: professionals }, { data: patients }, { data: rooms }, { data: allRooms }, { data: roomBookings }] = await Promise.all([
    supabase.from('appointments')
      .select(`*, patient:patients(first_name, last_name), professional:professionals(first_name, last_name), room:rooms(name)`)
      .gte('start_time', monthStart).lte('start_time', monthEnd)
      .order('start_time'),
    supabase.from('appointments')
      .select(`id, start_time, end_time, status, patient_id, professional_id, patient:patients(first_name, last_name), professional:professionals(first_name, last_name)`)
      .gte('start_time', calStart).lte('start_time', calEnd)
      .not('status', 'in', '("cancelled_with_notice","cancelled_without_notice")')
      .order('start_time'),
    supabase.from('professionals').select('id, first_name, last_name, room_hourly_rate').eq('status', 'active').is('deleted_at', null),
    supabase.from('patients').select('id, first_name, last_name').eq('status', 'active').is('deleted_at', null),
    supabase.from('rooms').select('id, name').eq('status', 'available'),
    supabase.from('rooms').select('*').order('name'),
    supabase.from('room_bookings')
      .select('id, room_id, professional_id, start_time, end_time, hours_used, status, notes, billed, room:rooms(name), professional:professionals(first_name, last_name, room_hourly_rate)')
      .order('start_time', { ascending: false }).limit(300),
  ])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-gray-500 text-sm">Gestión de turnos y disponibilidad</p>
        </div>
        <Button asChild className="bg-teal-600 hover:bg-teal-700">
          <Link href="/appointments/new"><Plus className="h-4 w-4 mr-2" />Nuevo turno</Link>
        </Button>
      </div>

      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar" className="gap-2"><CalendarDays className="h-4 w-4" />Calendario</TabsTrigger>
          <TabsTrigger value="rooms" className="gap-2"><Building2 className="h-4 w-4" />Consultorios</TabsTrigger>
          <TabsTrigger value="list" className="gap-2"><List className="h-4 w-4" />Lista</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-4">
          <AppointmentsCalendar
            appointments={(calAppointments as any) ?? []}
            professionals={professionals ?? []}
          />
        </TabsContent>

        <TabsContent value="rooms" className="mt-4">
          <RoomAgendaHourly
            rooms={allRooms ?? []}
            professionals={professionals ?? []}
            bookings={(roomBookings as any) ?? []}
          />
        </TabsContent>

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
