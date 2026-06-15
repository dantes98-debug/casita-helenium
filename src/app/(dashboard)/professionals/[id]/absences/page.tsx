import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AbsencesManager } from '@/components/professionals/absences-manager'

export default async function ProfessionalAbsencesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: professional }, { data: absences }] = await Promise.all([
    supabase.from('professionals').select('id, first_name, last_name').eq('id', id).is('deleted_at', null).single(),
    supabase.from('professional_absences').select('*').eq('professional_id', id).order('start_date', { ascending: false }),
  ])

  if (!professional) notFound()

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/professionals/${id}`}><ArrowLeft className="h-4 w-4 mr-1" />Volver</Link>
        </Button>
        <h1 className="text-2xl font-bold">
          {professional.last_name}, {professional.first_name} — Ausencias
        </h1>
      </div>

      <AbsencesManager
        professionalId={id}
        initialAbsences={(absences ?? []) as any}
      />
    </div>
  )
}
