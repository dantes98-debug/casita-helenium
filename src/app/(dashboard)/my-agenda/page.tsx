import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppointmentsCalendar } from '@/components/appointments/appointments-calendar'
import { MyBlocksView } from '@/components/schedule/my-blocks-view'
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

  const allowedRoles = ['professional', 'admin', 'super_admin', 'coordinator']
  if (!allowedRoles.includes(profile?.role ?? '')) redirect('/appointments')

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
  const calEnd = endOfWeek(addWeeks(now, 3), { weekStartsOn: 1 }).toISOString()

  const [
    { data: appointments },
    { data: blocks },
    { data: patients },
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
      .from('schedule_blocks')
      .select('*, room:rooms(id, name)')
      .eq('professional_id', professional.id)
      .gte('start_time', calStart)
      .lte('start_time', calEnd)
      .order('start_time'),
    supabase
      .from('patients')
      .select('id, first_name, last_name')
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('last_name'),
  ])

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi agenda</h1>
        <p className="text-sm text-gray-500 mt-1">Bienvenida, {professional.first_name}</p>
      </div>

      <Tabs defaultValue="blocks">
        <TabsList>
          <TabsTrigger value="blocks" className="gap-2">
            <Building2 className="h-4 w-4" />Mis bloques
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="h-4 w-4" />Calendario
          </TabsTrigger>
        </TabsList>

        <TabsContent value="blocks" className="mt-4">
          <MyBlocksView
            blocks={(blocks as any) ?? []}
            appointments={(appointments as any) ?? []}
            patients={patients ?? []}
            professional={professional}
          />
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <AppointmentsCalendar
            appointments={(appointments as any) ?? []}
            professionals={[{ id: professional.id, first_name: professional.first_name, last_name: professional.last_name }]}
            newAppointmentBase="/my-agenda"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
