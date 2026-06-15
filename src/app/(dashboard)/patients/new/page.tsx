import { createClient } from '@/lib/supabase/server'
import { PatientForm } from '@/components/patients/patient-form'

export default async function NewPatientPage() {
  const supabase = await createClient()

  const [{ data: professionals }, { data: profile }] = await Promise.all([
    supabase.from('professionals').select('id, first_name, last_name, profession')
      .eq('status', 'active').is('deleted_at', null).order('last_name'),
    supabase.from('profiles').select('role').single(),
  ])

  const isProfessional = profile?.role === 'professional'
  let defaultProfessionalId: string | undefined

  if (isProfessional) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: prof } = await supabase.from('professionals').select('id')
      .eq('user_id', user?.id ?? '').single()
    defaultProfessionalId = prof?.id
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nuevo paciente</h1>
        <p className="text-gray-500 text-sm">Completá los datos del paciente</p>
      </div>
      <PatientForm
        professionals={professionals ?? []}
        defaultProfessionalId={defaultProfessionalId}
        lockProfessional={isProfessional}
      />
    </div>
  )
}
