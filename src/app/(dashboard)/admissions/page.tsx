import { requireAdminRole } from '@/lib/auth-guards'
import { createClient } from '@/lib/supabase/server'
import { AdmissionsView } from '@/components/admissions/admissions-view'

export default async function AdmissionsPage() {
  await requireAdminRole()
  const supabase = await createClient()
  const [{ data: admissions }, { data: professionals }] = await Promise.all([
    supabase.from('admissions').select(`*, professional:professionals(first_name, last_name)`).order('contact_date', { ascending: false }),
    supabase.from('professionals').select('id, first_name, last_name').eq('status', 'active').is('deleted_at', null).order('last_name'),
  ])
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admisiones y derivaciones</h1>
        <p className="text-gray-500 text-sm">Gestión de consultas nuevas y seguimiento de ingreso</p>
      </div>
      <AdmissionsView admissions={admissions ?? []} professionals={professionals ?? []} />
    </div>
  )
}
