import { createClient } from '@/lib/supabase/server'
import { SettlementsView } from '@/components/settlements/settlements-view'

export default async function SettlementsPage() {
  const supabase = await createClient()
  const [{ data: settlements }, { data: professionals }] = await Promise.all([
    supabase.from('settlements')
      .select(`*, professional:professionals(first_name, last_name, profession)`)
      .order('period_start', { ascending: false }),
    supabase.from('professionals').select('id, first_name, last_name, profession').eq('status', 'active').is('deleted_at', null).order('last_name'),
  ])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Liquidaciones</h1>
        <p className="text-gray-500 text-sm">Cálculo y gestión de liquidaciones a profesionales</p>
      </div>
      <SettlementsView settlements={settlements ?? []} professionals={professionals ?? []} />
    </div>
  )
}
