'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { Users, Calendar, DollarSign, CheckCircle2, TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react'

interface Appointment {
  id: string; start_time: string; status: string; patient_id?: string
}
interface Payment {
  id: string; amount: number; date: string; status: string; patient_id: string
}
interface Patient {
  id: string; patient_source?: string; status: string
}

interface Props {
  professional: { id: string; first_name: string; last_name: string; commission_rate?: number | null; room_hourly_rate?: number | null }
  appointments: Appointment[]
  payments: Payment[]
  patients: Patient[]
  roomHoursMonth: number
}

const MONTHS = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i))

export function ProfessionalReports({ professional, appointments, payments, patients, roomHoursMonth }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))

  const stats = useMemo(() => {
    const monthStart = new Date(selectedMonth + '-01')
    const monthEnd = endOfMonth(monthStart)

    const monthAppts = appointments.filter(a => {
      const d = parseISO(a.start_time)
      return d >= monthStart && d <= monthEnd
    })
    const completed = monthAppts.filter(a => a.status === 'completed').length
    const scheduled = monthAppts.filter(a => ['confirmed', 'completed', 'no_show', 'absent'].includes(a.status)).length
    const noShow = monthAppts.filter(a => a.status === 'no_show' || a.status === 'absent').length
    const attendance = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0

    const monthPayments = payments.filter(p => p.date.startsWith(selectedMonth) && p.status === 'paid')
    const monthRevenue = monthPayments.reduce((a, p) => a + Number(p.amount), 0)
    const pendingPayments = payments.filter(p => p.status === 'pending')
    const pendingRevenue = pendingPayments.reduce((a, p) => a + Number(p.amount), 0)

    const totalPaid = payments.filter(p => p.status === 'paid').reduce((a, p) => a + Number(p.amount), 0)

    const commRate = professional.commission_rate ?? 0.3
    const centerPatientIds = new Set(patients.filter(p => p.patient_source === 'center').map(p => p.id))
    const ownPatientIds = new Set(patients.filter(p => p.patient_source === 'professional').map(p => p.id))

    const centerRevMonth = monthPayments.filter(p => centerPatientIds.has(p.patient_id)).reduce((a, p) => a + Number(p.amount), 0)
    const ownRevMonth = monthPayments.filter(p => ownPatientIds.has(p.patient_id)).reduce((a, p) => a + Number(p.amount), 0)
    const roomCost = roomHoursMonth * (professional.room_hourly_rate ?? 0)
    const profNet = centerRevMonth * (1 - commRate) + ownRevMonth - roomCost
    const centerOwed = centerRevMonth * commRate + roomCost

    return {
      monthAppts: monthAppts.length, completed, scheduled, noShow, attendance,
      monthRevenue, pendingRevenue, totalPaid, profNet, centerOwed,
      centerPatients: patients.filter(p => p.patient_source === 'center' && p.status === 'active').length,
      ownPatients: patients.filter(p => p.patient_source === 'professional' && p.status === 'active').length,
      activePatients: patients.filter(p => p.status === 'active').length,
    }
  }, [selectedMonth, appointments, payments, patients, professional, roomHoursMonth])

  const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 0 })

  // Trend: compare last 6 months revenue
  const monthlyTrend = MONTHS.map(m => {
    const key = format(m, 'yyyy-MM')
    const rev = payments.filter(p => p.date.startsWith(key) && p.status === 'paid').reduce((a, p) => a + Number(p.amount), 0)
    const appts = appointments.filter(a => a.start_time.startsWith(key))
    const done = appts.filter(a => a.status === 'completed').length
    return { label: format(m, 'MMM', { locale: es }), revenue: rev, completed: done, total: appts.length }
  })
  const maxRev = Math.max(...monthlyTrend.map(m => m.revenue), 1)

  return (
    <div className="space-y-6">
      {/* Month selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-sm font-medium text-gray-600">Período:</p>
        <div className="flex gap-2 flex-wrap">
          {MONTHS.map(m => {
            const key = format(m, 'yyyy-MM')
            const isSelected = key === selectedMonth
            return (
              <button
                key={key}
                onClick={() => setSelectedMonth(key)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors capitalize ${
                  isSelected ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {format(m, 'MMM yy', { locale: es })}
              </button>
            )
          })}
        </div>
      </div>

      {/* KPI cards */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Métricas del mes</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 mb-1"><Users className="h-3.5 w-3.5 text-blue-500" /><p className="text-xs text-gray-500 uppercase">Pacientes activos</p></div>
              <p className="text-2xl font-bold text-blue-700">{stats.activePatients}</p>
              <p className="text-xs text-gray-400">{stats.centerPatients} centro · {stats.ownPatients} propios</p>
            </CardContent>
          </Card>
          <Card className="bg-teal-50 border-teal-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 mb-1"><Calendar className="h-3.5 w-3.5 text-teal-500" /><p className="text-xs text-gray-500 uppercase">Sesiones del mes</p></div>
              <p className="text-2xl font-bold text-teal-700">{stats.completed}</p>
              <p className="text-xs text-gray-400">de {stats.scheduled} programadas</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 mb-1"><DollarSign className="h-3.5 w-3.5 text-green-500" /><p className="text-xs text-gray-500 uppercase">Ingresos del mes</p></div>
              <p className="text-2xl font-bold text-green-700">${fmt(stats.monthRevenue)}</p>
              <p className="text-xs text-gray-400">neto vos: ${fmt(stats.profNet)}</p>
            </CardContent>
          </Card>
          <Card className={`border ${stats.attendance >= 80 ? 'bg-emerald-50 border-emerald-100' : stats.attendance >= 60 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 mb-1"><CheckCircle2 className="h-3.5 w-3.5 text-gray-500" /><p className="text-xs text-gray-500 uppercase">Tasa de asistencia</p></div>
              <p className={`text-2xl font-bold ${stats.attendance >= 80 ? 'text-emerald-700' : stats.attendance >= 60 ? 'text-amber-700' : 'text-red-700'}`}>{stats.attendance}%</p>
              <p className="text-xs text-gray-400">{stats.noShow} ausente{stats.noShow !== 1 ? 's' : ''}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Billing section */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Facturación</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase">Ingresos totales</p>
              <p className="text-3xl font-bold text-gray-800">${fmt(stats.totalPaid)}</p>
              <p className="text-xs text-gray-400">todos los tiempos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase">Ingresos del mes</p>
              <p className="text-3xl font-bold text-green-700">${fmt(stats.monthRevenue)}</p>
              {stats.pendingRevenue > 0 && (
                <p className="text-xs text-amber-600">${fmt(stats.pendingRevenue)} pendiente de cobro</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase">Debe al centro</p>
              <p className="text-3xl font-bold text-red-600">${fmt(stats.centerOwed)}</p>
              <p className="text-xs text-gray-400">
                comisión ({Math.round((professional.commission_rate ?? 0.3) * 100)}%) + alquiler
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 6-month trend chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-teal-500" />Evolución últimos 6 meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 h-32">
            {monthlyTrend.map((m, i) => {
              const height = maxRev > 0 ? Math.max((m.revenue / maxRev) * 100, 4) : 4
              const isCurrentMonth = i === monthlyTrend.length - 1
              return (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                  <p className="text-xs text-gray-500">${fmt(m.revenue)}</p>
                  <div className="w-full flex items-end justify-center" style={{ height: 80 }}>
                    <div
                      className={`w-full rounded-t transition-all ${isCurrentMonth ? 'bg-teal-500' : 'bg-teal-200'}`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 capitalize">{m.label}</p>
                  <p className="text-[10px] text-gray-300">{m.completed}/{m.total}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payments pending */}
      {stats.pendingRevenue > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-700">Cobros pendientes: ${fmt(stats.pendingRevenue)}</p>
              <p className="text-xs text-amber-600">Hay pagos registrados como pendientes para este profesional.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
