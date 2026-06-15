import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ProfessionalForm } from '@/components/professionals/professional-form'

export default async function EditProfessionalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: professional } = await supabase.from('professionals').select('*').eq('id', id).is('deleted_at', null).single()
  if (!professional) notFound()
  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Editar profesional</h1>
        <p className="text-gray-500 text-sm">{professional.last_name}, {professional.first_name}</p>
      </div>
      <ProfessionalForm professional={professional} />
    </div>
  )
}
