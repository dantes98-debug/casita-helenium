import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppointmentsCalendar } from '@/components/appointments/appointments-calendar'
import { RoomAgendaHourly } from '@/components/rooms/room-agenda-hourly'
import { BlockTimeDialog } from '@/components/rooms/block-time-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, Building2 } from 'lucide-react'
import { startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'

export default async function MyAgendaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'professional') redirect('/appointments')

  let { data: professional } = await supabase
    .from('professionals')
    .select('id, first_name, last_name, room_hourly_rate')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!professional && user.email) {
    const { data: byEmail } = await supabase
      .from('professionals')
      .select('id, first_name, last_name, room_hourly_rate')
      .eq('email', user.email)
      .maybeSingle()
    professional = byEmail
    if (byEmail) {
      await supabase.from('professionals').update({ user_id: user.id }).eq('id', byEmail.id)
    }
  }

  if (!professional) redirect('/my-dashboard')

  const now = new Date()
  const calStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }).toISOString()
  const calEnd = endOfWeek(addWeeks(now, 2), { weekStartsOn: 1 }).toISOString()

  const [
    { data: appointments },
    { data: roomBookings },
    { data: rooms },
    { data: allProfessionals },
  ] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, patient_id, start_time, end_time, status, notes, professional_id, patient:patients(first_name, last_name), professional:professionals(first_name, last_name)')
      .eq('professional_id', professional.id)
      .gte('start_time', calStart)
      .lte('start_time', calEnd)
      .neq('status', 'cancelled_with_notice')
      .neq('status', 'cancelled_without_notice')
      .order('start_time'),
    supabase
      .from('room_bookings')
      .select('id, room_id, professional_id, start_time, end_time, hours_used, status, notes, billed, room:rooms(name), professional:professionals(first_name, last_name, room_hourly_rate)')
      .order('start_time', { ascending: false })
      .limit(300),
    supabase.from('rooms').select('*').order('name'),
    supabase.from('professionals').select('id, first_name, last_name, room_hourly_rate').eq('status', 'active'),
  ])

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Mi agenda</h1>

      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="h-4 w-4" />Turnos
          </TabsTrigger>
          <TabsTrigger value="rooms" className="gap-2">
            <Building2 className="h-4 w-4" />Consultorios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-4">
          <AppointmentsCalendar
            appointments={(appointments as any) ?? []}
            professionals={[{ id: professional.id, first_name: professional.first_name, last_name: professional.last_name }]}
            newAppointmentBase="/my-agenda"
          />
        </TabsContent>

        <TabsContent value="rooms" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <BlockTimeDialog rooms={rooms ?? []} professionalId={professional.id} />
          </div>
          <RoomAgendaHourly
            rooms={rooms ?? []}
            professionals={allProfessionals ?? []}
            bookings={(roomBookings as any) ?? []}
            defaultProfessionalId={professional.id}
            lockProfessional
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
