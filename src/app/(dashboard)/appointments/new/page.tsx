import { createClient } from '@/lib/supabase/server'
import { AppointmentForm } from '@/components/appointments/appointment-form'

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ patient_id?: string }>
}) {
  const { patient_id } = await searchParams
  const supabase = await createClient()
  const [{ data: professionals }, { data: patients }, { data: rooms }] = await Promise.all([
    supabase.from('professionals').select('id, first_name, last_name, profession').eq('status', 'active').is('deleted_at', null).order('last_name'),
    supabase.from('patients').select('id, first_name, last_name').is('deleted_at', null).in('status', ['active', 'waiting_list']).order('last_name'),
    supabase.from('rooms').select('id, name').eq('status', 'available'),
  ])

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nuevo turno</h1>
        <p className="text-gray-500 text-sm">Crear un nuevo turno en la agenda</p>
      </div>
      <AppointmentForm
        professionals={professionals ?? []}
        patients={patients ?? []}
        rooms={rooms ?? []}
        defaultPatientId={patient_id}
      />
    </div>
  )
}
