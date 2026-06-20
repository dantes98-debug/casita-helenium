import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'
import { AppointmentsCalendar } from '@/components/appointments/appointments-calendar'
import { MyBlocksView } from '@/components/schedule/my-blocks-view'
import { PsychologistDashboard } from '@/components/professionals/psychologist-dashboard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, Building2, LayoutDashboard } from 'lucide-react'
import { startOfWeek, endOfWeek, addWeeks, subWeeks, startOfMonth, endOfMonth } from 'date-fns'

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
    .select('id, first_name, last_name, room_hourly_rate, commission_rate, profession')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!professional && user.email) {
    const { data: byEmail } = await supabase
      .from('professionals')
      .select('id, first_name, last_name, room_hourly_rate, commission_rate, profession')
      .eq('email', user.email)
      .maybeSingle()
    professional = byEmail
    if (byEmail) {
      await supabase.from('professionals').update({ user_id: user.id }).eq('id', byEmail.id)
    }
  }

  if (!professional) {
    return (
      <div className="p-8 max-w-lg mx-auto mt-16 text-center space-y-4">
        <h1 className="text-xl font-semibold text-gray-800">Sin registro profesional</h1>
        <p className="text-gray-500 text-sm">
          Tu cuenta de usuario no está vinculada a un registro profesional en el sistema.
          Pedile a un administrador que vincule tu cuenta en la sección Profesionales.
        </p>
        <p className="text-xs text-gray-400">Usuario: {user.email}</p>
      </div>
    )
  }

  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  const now = new Date()
  const calStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }).toISOString()
  const calEnd = endOfWeek(addWeeks(now, 3), { weekStartsOn: 1 }).toISOString()
  const monthStart = startOfMonth(now).toISOString()
  const monthEnd = endOfMonth(now).toISOString()

  const [
    { data: appointments },
    { data: blocks },
    { data: patients },
    { data: monthAppointments },
    { data: payments },
    { data: roomBookings },
  ] = await Promise.all([
    adminClient
      .from('appointments')
      .select('id, patient_id, start_time, end_time, status, notes, professional_id, patient:patients(first_name, last_name), professional:professionals(first_name, last_name)')
      .eq('professional_id', professional.id)
      .gte('start_time', calStart)
      .lte('start_time', calEnd)
      .neq('status', 'cancelled_with_notice')
      .neq('status', 'cancelled_without_notice')
      .order('start_time'),
    adminClient
      .from('schedule_blocks')
      .select('*, room:rooms(id, name)')
      .eq('professional_id', professional.id)
      .gte('start_time', calStart)
      .lte('start_time', calEnd)
      .order('start_time'),
    adminClient
      .from('patients')
      .select('id, first_name, last_name, status, patient_source')
      .eq('primary_professional_id', professional.id)
      .is('deleted_at', null),
    adminClient
      .from('appointments')
      .select('id, patient_id, start_time, end_time, status, notes, professional_id, patient:patients(first_name, last_name), professional:professionals(first_name, last_name)')
      .eq('professional_id', professional.id)
      .gte('start_time', monthStart)
      .lte('start_time', monthEnd)
      .order('start_time'),
    adminClient
      .from('payments')
      .select('id, amount, date, status, patient_id')
      .gte('date', monthStart.split('T')[0])
      .lte('date', monthEnd.split('T')[0]),
    adminClient
      .from('room_bookings')
      .select('id, professional_id, start_time, end_time, hours_used, status')
      .eq('professional_id', professional.id)
      .eq('status', 'confirmed')
      .gte('start_time', monthStart)
      .lte('start_time', monthEnd),
  ])

  const myPatientIds = new Set((patients ?? []).map(p => p.id))
  const myPayments = (payments ?? []).filter(p => myPatientIds.has(p.patient_id))

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
          <TabsTrigger value="resumen" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />Resumen del mes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="blocks" className="mt-4">
          <MyBlocksView
            blocks={(blocks as any) ?? []}
            appointments={(appointments as any) ?? []}
            patients={patients?.map(p => ({ id: p.id, first_name: p.first_name, last_name: p.last_name })) ?? []}
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

        <TabsContent value="resumen" className="mt-4">
          <PsychologistDashboard
            professional={professional}
            appointments={(monthAppointments as any) ?? []}
            patients={patients ?? []}
            payments={myPayments}
            roomBookings={(roomBookings as any) ?? []}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
