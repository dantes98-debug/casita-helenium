import { createClient } from '@/lib/supabase/server'
import { CashView } from '@/components/cash/cash-view'
import { MonthSelector } from '@/components/ui/month-selector'
import { format, startOfMonth, endOfMonth, parse } from 'date-fns'

export default async function CashPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const supabase = await createClient()
  const { month } = await searchParams
  const activeMonth = month ?? format(new Date(), 'yyyy-MM')
  const parsedMonth = parse(activeMonth, 'yyyy-MM', new Date())
  const monthStart = format(startOfMonth(parsedMonth), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(parsedMonth), 'yyyy-MM-dd')

  const { data: movements } = await supabase
    .from('cash_movements')
    .select('*')
    .gte('date', monthStart).lte('date', monthEnd)
    .order('date', { ascending: false })

  const income = movements?.filter(m => m.type === 'income').reduce((acc, m) => acc + m.amount, 0) ?? 0
  const expenses = movements?.filter(m => m.type === 'expense').reduce((acc, m) => acc + m.amount, 0) ?? 0

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Caja</h1>
        <p className="text-gray-500 text-sm">Movimientos de ingresos y egresos del mes</p>
      </div>
      <MonthSelector activeMonth={activeMonth} />
      <CashView movements={movements ?? []} totalIncome={income} totalExpenses={expenses} />
    </div>
  )
}
