import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PsychologistDashboard } from '@/components/professionals/psychologist-dashboard'
import { startOfMonth, endOfMonth } from 'date-fns'

export default async function MyDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'professional') redirect('/dashboard')

  // Professionals land on my-agenda as their home page (has blocks + calendar)
  redirect('/my-agenda')

  let { data: professional } = await supabase
    .from('professionals')
    .select('id, first_name, last_name, profession, commission_rate, room_hourly_rate')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!professional && user.email) {
    const { data: byEmail } = await supabase
      .from('professionals')
      .select('id, first_name, last_name, profession, commission_rate, room_hourly_rate')
      .eq('email', user.email)
      .maybeSingle()
    professional = byEmail
    if (byEmail) {
      await supabase.from('professionals').update({ user_id: user.id }).eq('id', byEmail.id)
    }
  }

  if (!professional) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-4 mt-16">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
          <span className="text-2xl">👤</span>
        </div>
        <h2 className="text-lg font-semibold text-gray-800">Perfil no vinculado</h2>
        <p className="text-gray-500 text-sm">
          Tu cuenta (<strong>{user.email}</strong>) no está conectada a una ficha de profesional.
        </p>
        <p className="text-gray-400 text-xs">Contactá al administrador.</p>
      </div>
    )
  }

  const now = new Date()
  const monthStart = startOfMonth(now).toISOString()
  const monthEnd = endOfMonth(now).toISOString()

  const [
    { data: appointments },
    { data: patients },
    { data: payments },
    { data: roomBookings },
  ] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, patient_id, start_time, end_time, status, notes, professional_id, patient:patients(first_name, last_name), professional:professionals(first_name, last_name)')
      .eq('professional_id', professional.id)
      .gte('start_time', monthStart)
      .lte('start_time', monthEnd)
      .order('start_time'),
    supabase
      .from('patients')
      .select('id, first_name, last_name, status, patient_source')
      .eq('primary_professional_id', professional.id)
      .is('deleted_at', null),
    supabase
      .from('payments')
      .select('id, amount, date, status, patient_id')
      .gte('date', monthStart.split('T')[0])
      .lte('date', monthEnd.split('T')[0]),
    supabase
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          ¡Hola, {professional.first_name}! 👋
        </h1>
        <p className="text-gray-500 text-sm">
          Gracias por elegir La Casita. Nos encanta trabajar con vos.
        </p>
      </div>

      <PsychologistDashboard
        professional={professional}
        appointments={(appointments as any) ?? []}
        patients={patients ?? []}
        payments={myPayments}
        roomBookings={(roomBookings as any) ?? []}
      />
    </div>
  )
}
