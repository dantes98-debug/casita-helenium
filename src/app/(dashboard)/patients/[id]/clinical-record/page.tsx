import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { ClinicalRecordView } from '@/components/clinical/clinical-record-view'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function ClinicalRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: patient }, { data: record }] = await Promise.all([
    supabase.from('patients').select('first_name, last_name').eq('id', id).is('deleted_at', null).single(),
    supabase.from('clinical_records').select('*').eq('patient_id', id).single(),
  ])

  if (!patient) notFound()
  if (!record) redirect(`/patients/${id}`)

  const { data: notes } = await supabase
    .from('clinical_notes')
    .select(`*, professional:professionals(first_name, last_name, profession)`)
    .eq('clinical_record_id', record.id)
    .order('date', { ascending: false })

  const { data: professionals } = await supabase
    .from('professionals').select('id, first_name, last_name, profession')
    .eq('status', 'active').is('deleted_at', null)

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/patients/${id}`}><ArrowLeft className="h-4 w-4 mr-1" />Volver al paciente</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Historia Clínica</h1>
          <p className="text-gray-500">{patient.last_name}, {patient.first_name}</p>
        </div>
      </div>
      <ClinicalRecordView record={record} notes={notes ?? []} patientId={id} professionals={professionals ?? []} />
    </div>
  )
}
