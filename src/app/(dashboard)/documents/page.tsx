import { createClient } from '@/lib/supabase/server'
import { DocumentsView } from '@/components/documents/documents-view'

export default async function DocumentsPage() {
  const supabase = await createClient()
  const [{ data: documents }, { data: patients }, { data: professionals }] = await Promise.all([
    supabase.from('documents').select(`*, patient:patients(first_name, last_name), professional:professionals(first_name, last_name), uploader:profiles(full_name)`).order('created_at', { ascending: false }),
    supabase.from('patients').select('id, first_name, last_name').is('deleted_at', null).order('last_name'),
    supabase.from('professionals').select('id, first_name, last_name').eq('status', 'active').is('deleted_at', null),
  ])
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
        <p className="text-gray-500 text-sm">Gestión de archivos y documentación clínica/administrativa</p>
      </div>
      <DocumentsView documents={documents ?? []} patients={patients ?? []} professionals={professionals ?? []} />
    </div>
  )
}
