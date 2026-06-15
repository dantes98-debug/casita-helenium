import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PatientForm } from '@/components/patients/patient-form'

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const [{ data: patient }, { data: professionals }] = await Promise.all([
    supabase.from('patients').select('*').eq('id', id).is('deleted_at', null).single(),
    supabase.from('professionals').select('id, first_name, last_name, profession').eq('status', 'active').is('deleted_at', null).order('last_name'),
  ])
  if (!patient) notFound()
  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Editar paciente</h1>
        <p className="text-gray-500 text-sm">{patient.last_name}, {patient.first_name}</p>
      </div>
      <PatientForm patient={patient} professionals={professionals ?? []} />
    </div>
  )
}
