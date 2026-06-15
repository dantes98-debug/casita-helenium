import { createClient } from '@/lib/supabase/server'
import { DebtsTable } from '@/components/debts/debts-table'
import { Card, CardContent } from '@/components/ui/card'

export default async function DebtsPage() {
  const supabase = await createClient()
  const { data: debts } = await supabase
    .from('debts')
    .select(`*, patient:patients(first_name, last_name), professional:professionals(first_name, last_name)`)
    .order('due_date', { ascending: true })

  const activeDebts = debts?.filter(d => d.status === 'active') ?? []
  const total = activeDebts.reduce((acc, d) => acc + d.amount, 0)
  const overdue = activeDebts.filter(d => d.due_date && new Date(d.due_date) < new Date())
  const overdueTotal = overdue.reduce((acc, d) => acc + d.amount, 0)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Deudas</h1>
        <p className="text-gray-500 text-sm">Control de saldos pendientes</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-red-50 border-red-100">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Total deudas activas</p>
            <p className="text-2xl font-bold text-red-700">${total.toLocaleString('es-AR')}</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-100">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Deudas vencidas</p>
            <p className="text-2xl font-bold text-orange-700">${overdueTotal.toLocaleString('es-AR')}</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-100">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Cantidad activas</p>
            <p className="text-2xl font-bold text-yellow-700">{activeDebts.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-100">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Vencidas</p>
            <p className="text-2xl font-bold text-red-800">{overdue.length}</p>
          </CardContent>
        </Card>
      </div>
      <DebtsTable debts={debts ?? []} />
    </div>
  )
}
