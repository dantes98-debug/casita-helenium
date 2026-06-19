export const revalidate = 60

import { createClient } from '@/lib/supabase/server'
import { KPICard } from '@/components/dashboard/kpi-card'
import { AppointmentsChart } from '@/components/dashboard/appointments-chart'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { UpcomingAppointments } from '@/components/dashboard/upcoming-appointments'
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, subMonths, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import {
  Users, UserCheck, Calendar, TrendingUp, AlertCircle,
  DollarSign, Clock, UserPlus, Activity, ArrowRight, CheckCircle2
} from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const now = new Date()
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')
  const todayStart = startOfDay(now).toISOString()
  const todayEnd = endOfDay(now).toISOString()

  // 7 days for appointments chart
  const days = Array.from({ length: 7 }, (_, i) => subDays(now, 6 - i))
  // 6 months for revenue chart
  const months = Array.from({ length: 6 }, (_, i) => subMonths(now, 5 - i))

  const prevMonthStart = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd')
  const prevMonthEnd = format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd')

  // All data in one Promise.all — zero N+1
  const [
    { count: activePatients },
    { count: newPatients },
    { count: waitingList },
    { count: todayAppts },
    { count: monthAppts },
    { count: pendingConfirm },
    { data: paymentsThisMonth },
    { data: pendingPayments },
    { count: activeDebts },
    { count: activeProfessionals },
    { data: todayAppointmentRows },
    { data: auditLogs },
    { data: allAppointments7d },
    { data: allPayments6m },
    { data: prevMonthPayments },
    { data: allProfessionals },
    { data: allPatients },
    { data: monthRoomBookings },
  ] = await Promise.all([
    supabase.from('patients').select('id', { count: 'exact', head: true }).eq('status', 'active').is('deleted_at', null),
    supabase.from('patients').select('id', { count: 'exact', head: true }).gte('admission_date', monthStart).lte('admission_date', monthEnd).is('deleted_at', null),
    supabase.from('patients').select('id', { count: 'exact', head: true }).eq('status', 'waiting_list').is('deleted_at', null),
    supabase.from('appointments').select('id', { count: 'exact', head: true }).gte('start_time', todayStart).lte('start_time', todayEnd),
    supabase.from('appointments').select('id', { count: 'exact', head: true }).gte('start_time', monthStart).lte('start_time', monthEnd + 'T23:59:59Z'),
    supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('status', 'pending_confirmation'),
    supabase.from('payments').select('amount, patient_id').eq('status', 'paid').gte('date', monthStart).lte('date', monthEnd).is('deleted_at', null),
    supabase.from('payments').select('amount').eq('status', 'pending').is('deleted_at', null),
    supabase.from('debts').select('id', { count: 'exact', head: true }).in('status', ['active', 'partially_paid']),
    supabase.from('professionals').select('id', { count: 'exact', head: true }).eq('status', 'active').is('deleted_at', null),
    // Today's appointments for the widget
    supabase.from('appointments')
      .select('id, start_time, status, patient:patients(first_name, last_name), professional:professionals(first_name, last_name)')
      .gte('start_time', now.toISOString())
      .lte('start_time', todayEnd)
      .not('status', 'in', '("cancelled_with_notice","cancelled_without_notice","rescheduled")')
      .order('start_time')
      .limit(8),
    // Recent audit logs
    supabase.from('audit_logs')
      .select('id, action, table_name, created_at, user:profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(6),
    // All appointments in last 7 days (for chart — one query instead of 14)
    supabase.from('appointments')
      .select('start_time, status')
      .gte('start_time', days[0].toISOString())
      .lte('start_time', endOfDay(days[6]).toISOString()),
    // All payments in last 6 months (for chart — one query instead of 6)
    supabase.from('payments')
      .select('amount, date')
      .eq('status', 'paid')
      .gte('date', format(startOfMonth(months[0]), 'yyyy-MM-dd'))
      .lte('date', format(endOfMonth(months[5]), 'yyyy-MM-dd'))
      .is('deleted_at', null),
    // Previous month payments for comparison
    supabase.from('payments').select('amount').eq('status', 'paid').gte('date', prevMonthStart).lte('date', prevMonthEnd).is('deleted_at', null),
    // P&L: professionals with commission rates and their patients
    supabase.from('professionals').select('id, first_name, last_name, commission_rate, room_hourly_rate').eq('status', 'active').is('deleted_at', null),
    supabase.from('patients').select('id, primary_professional_id, patient_source').is('deleted_at', null),
    supabase.from('room_bookings').select('professional_id, hours_used').gte('start_time', monthStart + 'T00:00:00').lte('start_time', monthEnd + 'T23:59:59').eq('status', 'confirmed'),
  ])

  const monthlyRevenue = paymentsThisMonth?.reduce((acc, p) => acc + (p.amount || 0), 0) ?? 0
  const totalPending = pendingPayments?.reduce((acc, p) => acc + (p.amount || 0), 0) ?? 0
  const prevMonthRevenue = prevMonthPayments?.reduce((acc, p) => acc + (p.amount || 0), 0) ?? 0
  const revenueDelta = prevMonthRevenue > 0 ? ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue * 100) : 0

  // P&L: split revenue between center and professionals
  let centerShare = 0
  let profsShare = 0
  if (allProfessionals && allPatients && paymentsThisMonth) {
    for (const payment of paymentsThisMonth) {
      const patient = allPatients.find(p => p.id === (payment as any).patient_id)
      if (!patient) { centerShare += payment.amount || 0; continue }
      const prof = allProfessionals.find(p => p.id === patient.primary_professional_id)
      if (patient.patient_source === 'center') {
        const commRate = prof?.commission_rate ?? 0.3
        centerShare += (payment.amount || 0) * commRate
        profsShare += (payment.amount || 0) * (1 - commRate)
      } else {
        profsShare += payment.amount || 0
      }
    }
  }
  const totalRoomRevenue = (monthRoomBookings ?? []).reduce((acc, b) => {
    const prof = allProfessionals?.find(p => p.id === b.professional_id)
    return acc + Number(b.hours_used || 0) * Number(prof?.room_hourly_rate || 0)
  }, 0)
  centerShare += totalRoomRevenue

  // Build chart data from the single bulk queries
  const appointmentsChartData = days.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd')
    const dayRows = allAppointments7d?.filter(a => a.start_time.startsWith(dayStr)) ?? []
    return {
      name: format(day, 'EEE', { locale: es }),
      turnos: dayRows.length,
      realizados: dayRows.filter(a => a.status === 'completed').length,
    }
  })

  const revenueChartData = months.map(month => {
    const monthStr = format(month, 'yyyy-MM')
    const total = allPayments6m?.filter(p => p.date.startsWith(monthStr)).reduce((acc, p) => acc + (p.amount || 0), 0) ?? 0
    return { name: format(month, 'MMM', { locale: es }), ingresos: total }
  })

  const isEmpty = (activeProfessionals ?? 0) === 0 && (activePatients ?? 0) === 0
  const hasDataButNoPayments = !isEmpty && monthlyRevenue === 0

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm">Resumen general de La Casita Helenium</p>
      </div>

      {/* Onboarding — solo cuando no hay datos */}
      {isEmpty && (
        <Card className="border-teal-200 bg-teal-50">
          <CardContent className="p-6">
            <p className="font-semibold text-teal-800 mb-4">¡Bienvenido al sistema! Seguí estos pasos para empezar:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { step: '1', label: 'Cargá un profesional', href: '/professionals/new', done: (activeProfessionals ?? 0) > 0 },
                { step: '2', label: 'Cargá tu primer paciente', href: '/patients/new', done: (activePatients ?? 0) > 0 },
                { step: '3', label: 'Agendá un turno', href: '/appointments/new', done: (monthAppts ?? 0) > 0 },
              ].map(s => (
                <Link key={s.step} href={s.href} className={`flex items-center gap-3 rounded-lg border p-4 transition-colors ${s.done ? 'bg-white border-teal-300 opacity-60' : 'bg-white border-teal-200 hover:border-teal-400'}`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${s.done ? 'bg-teal-500 text-white' : 'bg-teal-100 text-teal-700'}`}>
                    {s.done ? <CheckCircle2 className="h-4 w-4" /> : s.step}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{s.label}</span>
                  {!s.done && <ArrowRight className="ml-auto h-4 w-4 text-teal-500" />}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Pacientes</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Pacientes activos" value={activePatients ?? 0} icon={<Users className="h-5 w-5 text-teal-600" />} color="teal" />
          <KPICard title="Nuevos este mes" value={newPatients ?? 0} icon={<UserPlus className="h-5 w-5 text-blue-600" />} color="blue" />
          <KPICard title="Lista de espera" value={waitingList ?? 0} icon={<Clock className="h-5 w-5 text-amber-600" />} color="amber" />
          <KPICard title="Profesionales activos" value={activeProfessionals ?? 0} icon={<UserCheck className="h-5 w-5 text-emerald-600" />} color="emerald" />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Agenda</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <KPICard title="Turnos hoy" value={todayAppts ?? 0} icon={<Calendar className="h-5 w-5 text-indigo-600" />} color="indigo" />
          <KPICard title="Turnos este mes" value={monthAppts ?? 0} icon={<Activity className="h-5 w-5 text-purple-600" />} color="purple" />
          <KPICard title="Pendientes confirmar" value={pendingConfirm ?? 0} icon={<AlertCircle className="h-5 w-5 text-orange-600" />} color="orange" alert={(pendingConfirm ?? 0) > 0} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Finanzas</h2>
        {hasDataButNoPayments ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-800">Sin pagos registrados este mes</p>
                <p className="text-sm text-amber-600">Registrá el primer pago para ver las métricas financieras aquí.</p>
              </div>
              <Link href="/payments/new" className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors">
                <ArrowRight className="h-4 w-4" />Registrar pago
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <KPICard title="Facturación del mes" value={`$${monthlyRevenue.toLocaleString('es-AR')}`} icon={<DollarSign className="h-5 w-5 text-green-600" />} color="green" />
            <KPICard title="Cobros pendientes" value={`$${totalPending.toLocaleString('es-AR')}`} icon={<TrendingUp className="h-5 w-5 text-yellow-600" />} color="yellow" alert={totalPending > 0} />
            <KPICard title="Deudas activas" value={activeDebts ?? 0} icon={<AlertCircle className="h-5 w-5 text-red-600" />} color="red" alert={(activeDebts ?? 0) > 0} />
          </div>
        )}
      </section>

      {/* P&L split */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Distribución de ingresos — este mes</h2>
          {prevMonthRevenue > 0 && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${revenueDelta >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {revenueDelta >= 0 ? '+' : ''}{revenueDelta.toFixed(1)}% vs mes anterior
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-teal-50 border-teal-100">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 uppercase mb-1">Ingreso centro</p>
              <p className="text-2xl font-bold text-teal-700">${centerShare.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
              <p className="text-xs text-gray-400 mt-0.5">comisiones + alquiler consultorios</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 uppercase mb-1">Pagos a profesionales</p>
              <p className="text-2xl font-bold text-blue-700">${profsShare.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
              <p className="text-xs text-gray-400 mt-0.5">lo que reciben en total</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 uppercase mb-1">Total facturado</p>
              <p className="text-2xl font-bold text-gray-700">${monthlyRevenue.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
              {monthlyRevenue > 0 && (
                <div className="mt-2 h-2 rounded-full bg-blue-200 overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full" style={{ width: `${(centerShare / monthlyRevenue) * 100}%` }} />
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {monthlyRevenue > 0 ? `Centro ${Math.round((centerShare / monthlyRevenue) * 100)}% · Profs ${Math.round((profsShare / monthlyRevenue) * 100)}%` : 'Sin datos'}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <AppointmentsChart data={appointmentsChartData} />
          <RevenueChart data={revenueChartData} />
        </div>
        <div className="space-y-6">
          <UpcomingAppointments appointments={(todayAppointmentRows as any) ?? []} />
          <RecentActivity logs={(auditLogs as any) ?? []} />
        </div>
      </div>
    </div>
  )
}
