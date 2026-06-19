import { createClient } from '@/lib/supabase/server'
import { PatientsTable } from '@/components/patients/patients-table'
import { WaitlistPanel } from '@/components/patients/waitlist-panel'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { Plus, Users, Clock } from 'lucide-react'

export default async function PatientsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const isProfessional = profile?.role === 'professional'

  // If professional, find their own professional record to filter patients
  let professionalId: string | null = null
  if (isProfessional) {
    let { data: prof } = await supabase
      .from('professionals')
      .select('id')
      .eq('user_id', user!.id)
      .maybeSingle()
    if (!prof && user?.email) {
      const { data: byEmail } = await supabase
        .from('professionals')
        .select('id')
        .eq('email', user.email)
        .maybeSingle()
      prof = byEmail
    }
    professionalId = prof?.id ?? null
  }

  let patientsQuery = supabase
    .from('patients')
    .select('*, primary_professional_id, primary_professional:professionals(first_name, last_name, profession)')
    .is('deleted_at', null)
    .neq('status', 'waiting_list')
    .order('last_name')

  let waitlistQuery = supabase
    .from('patients')
    .select('id, first_name, last_name, phone, admission_date, observations, primary_professional:professionals(first_name, last_name)')
    .is('deleted_at', null)
    .eq('status', 'waiting_list')
    .order('admission_date')

  if (isProfessional && professionalId) {
    patientsQuery = patientsQuery.eq('primary_professional_id', professionalId) as any
    waitlistQuery = waitlistQuery.eq('primary_professional_id', professionalId) as any
  }

  const [
    { data: patients },
    { data: waitlist },
    { data: professionals },
  ] = await Promise.all([
    patientsQuery,
    waitlistQuery,
    supabase
      .from('professionals')
      .select('id, first_name, last_name, profession')
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('last_name'),
  ])

  const waitlistCount = waitlist?.length ?? 0

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
          <p className="text-gray-500 text-sm">
            {isProfessional ? 'Tus pacientes asignados' : `${patients?.length ?? 0} pacientes activos`}
          </p>
        </div>
        <Button asChild className="bg-teal-600 hover:bg-teal-700">
          <Link href="/patients/new"><Plus className="h-4 w-4 mr-2" />Nuevo paciente</Link>
        </Button>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active" className="gap-2"><Users className="h-4 w-4" />Activos</TabsTrigger>
          <TabsTrigger value="waitlist" className="gap-2">
            <Clock className="h-4 w-4" />Lista de espera
            {waitlistCount > 0 && (
              <span className="ml-1 bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                {waitlistCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <PatientsTable patients={patients ?? []} hideProfessionalColumn={isProfessional} professionals={isProfessional ? undefined : professionals ?? []} />
        </TabsContent>

        <TabsContent value="waitlist" className="mt-4">
          <WaitlistPanel patients={(waitlist as any) ?? []} professionals={professionals ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
