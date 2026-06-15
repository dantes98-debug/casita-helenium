import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppointmentForm } from '@/components/appointments/appointment-form'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function MyAgendaNewPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; hour?: string }>
}) {
  const { date, hour } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'professional') redirect('/appointments/new')

  let { data: professional } = await supabase
    .from('professionals')
    .select('id, first_name, last_name, profession')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!professional && user.email) {
    const { data: byEmail } = await supabase
      .from('professionals')
      .select('id, first_name, last_name, profession')
      .eq('email', user.email)
      .maybeSingle()
    professional = byEmail
  }

  if (!professional) redirect('/my-agenda')

  // Only show patients assigned to this professional
  const { data: patients } = await supabase
    .from('patients')
    .select('id, first_name, last_name')
    .eq('primary_professional_id', professional.id)
    .is('deleted_at', null)
    .in('status', ['active', 'waiting_list'])
    .order('last_name')

  const { data: rooms } = await supabase.from('rooms').select('id, name').eq('status', 'available')

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/my-agenda"><ArrowLeft className="h-4 w-4 mr-1" />Volver</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo turno</h1>
          <p className="text-gray-500 text-sm">{professional.last_name}, {professional.first_name}</p>
        </div>
      </div>
      <AppointmentForm
        professionals={[{ id: professional.id, first_name: professional.first_name, last_name: professional.last_name, profession: professional.profession ?? '' }]}
        patients={patients ?? []}
        rooms={rooms ?? []}
        defaultProfessionalId={professional.id}
        lockProfessional
        hidePay
        defaultDate={date}
        defaultHour={hour}
        redirectAfter="/my-agenda"
      />
    </div>
  )
}
