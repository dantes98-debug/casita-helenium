import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { AppointmentForm } from '@/components/appointments/appointment-form'
import { format } from 'date-fns'

export default async function EditAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const [{ data: appointment }, { data: professionals }, { data: patients }, { data: rooms }] = await Promise.all([
    supabase.from('appointments').select('*').eq('id', id).single(),
    supabase.from('professionals').select('id, first_name, last_name, profession').eq('status', 'active').is('deleted_at', null).order('last_name'),
    supabase.from('patients').select('id, first_name, last_name').is('deleted_at', null).order('last_name'),
    supabase.from('rooms').select('id, name').eq('status', 'available'),
  ])
  if (!appointment) notFound()

  const startDt = new Date(appointment.start_time)
  const endDt = new Date(appointment.end_time)

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Editar turno</h1>
      </div>
      <AppointmentForm
        professionals={professionals ?? []} patients={patients ?? []} rooms={rooms ?? []}
        appointment={{
          id: appointment.id,
          patient_id: appointment.patient_id,
          professional_id: appointment.professional_id,
          room_id: appointment.room_id ?? '',
          start_date: format(startDt, 'yyyy-MM-dd'),
          start_time: format(startDt, 'HH:mm'),
          end_time: format(endDt, 'HH:mm'),
          value: appointment.value,
          payment_method: appointment.payment_method ?? '',
          payment_status: appointment.payment_status,
          admin_notes: appointment.admin_notes ?? '',
        }}
      />
    </div>
  )
}
