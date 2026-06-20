import { requireAdminRole } from '@/lib/auth-guards'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { AppointmentsChart } from '@/components/dashboard/appointments-chart'
import { MonthSelector } from '@/components/ui/month-selector'
import { format, startOfMonth, endOfMonth, subMonths, subDays, endOfDay, parse } from 'date-fns'
import { es } from 'date-fns/locale'

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireAdminRole()
  const supabase = await createClient()
  const { month } = await searchParams
  const activeMonth = month ?? format(new Date(), 'yyyy-MM')
  const parsedMonth = parse(activeMonth, 'yyyy-MM', new Date())
  const monthStart = format(startOfMonth(parsedMonth), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(parsedMonth), 'yyyy-MM-dd')

  const now = new Date()
  const days = Array.from({ length: 7 }, (_, i) => subDays(now, 6 - i))
  const months = Array.from({ length: 6 }, (_, i) => subMonths(now, 5 - i))

  const [
    { data: patientsByStatus },
    { data: sessionsByProfessional },
    { data: revenueByMethod },
    { data: allAppointments7d },
    { data: allPayments6m },
  ] = await Promise.all([
    supabase.from('patients').select('status').is('deleted_at', null),
    supabase.from('appointments')
      .select('professional:professionals(first_name, last_name), status')
      .eq('status', 'completed')
      .gte('start_time', monthStart + 'T00:00:00Z').lte('start_time', monthEnd + 'T23:59:59Z'),
    supabase.from('payments').select('payment_method, amount')
      .eq('status', 'paid').is('deleted_at', null)
      .gte('date', monthStart).lte('date', monthEnd),
    supabase.from('appointments').select('start_time, status')
      .gte('start_time', days[0].toISOString()).lte('start_time', endOfDay(days[6]).toISOString()),
    supabase.from('payments').select('amount, date').eq('status', 'paid').is('deleted_at', null)
      .gte('date', format(startOfMonth(months[0]), 'yyyy-MM-dd'))
      .lte('date', format(endOfMonth(months[5]), 'yyyy-MM-dd')),
  ])

  const appointmentsChartData = days.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd')
    const dayRows = allAppointments7d?.filter(a => a.start_time.startsWith(dayStr)) ?? []
    return { name: format(day, 'EEE', { locale: es }), turnos: dayRows.length, realizados: dayRows.filter(a => a.status === 'completed').length }
  })
  const revenueChartData = months.map(month => {
    const monthStr = format(month, 'yyyy-MM')
    const total = allPayments6m?.filter(p => p.date.startsWith(monthStr)).reduce((acc, p) => acc + (p.amount || 0), 0) ?? 0
    return { name: format(month, 'MMM', { locale: es }), ingresos: total }
  })

  const statusCounts = patientsByStatus?.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>) ?? {}

  const professionalsMap = new Map<string, number>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sessionsByProfessional?.forEach((s: any) => {
    const name = s.professional ? `${(s.professional as { first_name: string; last_name: string }).last_name}, ${(s.professional as { first_name: string; last_name: string }).first_name}` : 'Sin asignar'
    professionalsMap.set(name, (professionalsMap.get(name) ?? 0) + 1)
  })

  const methodMap = new Map<string, number>()
  revenueByMethod?.forEach(p => {
    methodMap.set(p.payment_method, (methodMap.get(p.payment_method) ?? 0) + p.amount)
  })

  const statusLabels: Record<string, string> = {
    active: 'Activos', paused: 'En pausa', discharged: 'Alta',
    inactive: 'Inactivos', waiting_list: 'Lista de espera', referred: 'Derivados',
  }
  const methodLabels: Record<string, string> = {
    cash: 'Efectivo', transfer: 'Transferencia', mercadopago: 'Mercado Pago',
    debit: 'Débito', credit: 'Crédito', other: 'Otro',
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="text-gray-500 text-sm">Análisis y métricas del centro</p>
      </div>

      <MonthSelector activeMonth={activeMonth} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={revenueChartData} />
        <AppointmentsChart data={appointmentsChartData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Pacientes por estado</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{statusLabels[status] ?? status}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Sesiones este mes por profesional</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Array.from(professionalsMap.entries()).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
              <div key={name} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 truncate">{name}</span>
                <span className="font-semibold shrink-0 ml-2">{count}</span>
              </div>
            ))}
            {professionalsMap.size === 0 && <p className="text-sm text-gray-400">Sin sesiones este mes</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Ingresos por medio de pago (mes)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Array.from(methodMap.entries()).map(([method, amount]) => (
              <div key={method} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{methodLabels[method] ?? method}</span>
                <span className="font-semibold">${amount.toLocaleString('es-AR')}</span>
              </div>
            ))}
            {methodMap.size === 0 && <p className="text-sm text-gray-400">Sin cobros este mes</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
