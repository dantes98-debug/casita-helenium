import { requireAdminRole } from '@/lib/auth-guards'
import { createClient } from '@/lib/supabase/server'
import { PaymentsTable } from '@/components/payments/payments-table'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { format, startOfMonth, endOfMonth } from 'date-fns'

export default async function PaymentsPage() {
  await requireAdminRole()
  const supabase = await createClient()
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd')

  const [{ data: payments }, { data: monthPayments }] = await Promise.all([
    supabase.from('payments')
      .select(`*, patient:patients(first_name, last_name), professional:professionals(first_name, last_name)`)
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .limit(100),
    supabase.from('payments').select('amount, status')
      .is('deleted_at', null).gte('date', monthStart).lte('date', monthEnd),
  ])

  const totalPaid = monthPayments?.filter(p => p.status === 'paid').reduce((acc, p) => acc + p.amount, 0) ?? 0
  const totalPending = monthPayments?.filter(p => p.status === 'pending').reduce((acc, p) => acc + p.amount, 0) ?? 0

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pagos</h1>
          <p className="text-gray-500 text-sm">Gestión de cobros y comprobantes</p>
        </div>
        <Button asChild className="bg-teal-600 hover:bg-teal-700">
          <Link href="/payments/new"><Plus className="h-4 w-4 mr-2" />Registrar pago</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-100">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Cobrado este mes</p>
            <p className="text-2xl font-bold text-green-700">${totalPaid.toLocaleString('es-AR')}</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-100">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Pendiente de cobro</p>
            <p className="text-2xl font-bold text-yellow-700">${totalPending.toLocaleString('es-AR')}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Total del mes</p>
            <p className="text-2xl font-bold text-blue-700">${(totalPaid + totalPending).toLocaleString('es-AR')}</p>
          </CardContent>
        </Card>
      </div>

      <PaymentsTable payments={payments ?? []} />
    </div>
  )
}
