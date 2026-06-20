import { requireAdminRole } from '@/lib/auth-guards'
import { createClient } from '@/lib/supabase/server'
import { ProfessionalsTable } from '@/components/professionals/professionals-table'
import { ProfessionalPerformance } from '@/components/professionals/professional-performance'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { Plus, Users, TrendingUp } from 'lucide-react'
import { startOfMonth, endOfMonth } from 'date-fns'

export default async function ProfessionalsPage() {
  await requireAdminRole()
  const supabase = await createClient()

  const now = new Date()
  const monthStart = startOfMonth(now).toISOString()
  const monthEnd = endOfMonth(now).toISOString()

  const [
    { data: professionals },
    { data: appointments },
    { data: payments },
    { data: patients },
  ] = await Promise.all([
    supabase
      .from('professionals')
      .select('*, professional_agreements(id, type, session_value, center_percentage, professional_percentage, status)')
      .is('deleted_at', null)
      .order('last_name'),
    supabase
      .from('appointments')
      .select('professional_id, patient_id, status')
      .gte('start_time', monthStart)
      .lte('start_time', monthEnd),
    supabase
      .from('payments')
      .select('patient_id, amount, status')
      .gte('payment_date', monthStart)
      .lte('payment_date', monthEnd),
    supabase
      .from('patients')
      .select('id, primary_professional_id, patient_source')
      .is('deleted_at', null),
  ])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profesionales</h1>
          <p className="text-gray-500 text-sm">{professionals?.filter(p => p.status === 'active').length ?? 0} activos</p>
        </div>
        <Button asChild className="bg-teal-600 hover:bg-teal-700">
          <Link href="/professionals/new"><Plus className="h-4 w-4 mr-2" />Nuevo profesional</Link>
        </Button>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list" className="gap-2"><Users className="h-4 w-4" />Listado</TabsTrigger>
          <TabsTrigger value="performance" className="gap-2"><TrendingUp className="h-4 w-4" />Rendimiento</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <ProfessionalsTable professionals={professionals ?? []} />
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <ProfessionalPerformance
            professionals={professionals ?? []}
            appointments={appointments ?? []}
            payments={payments ?? []}
            patients={patients ?? []}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
