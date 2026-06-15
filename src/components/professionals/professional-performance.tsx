'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Users, CheckCircle2, UserX, DollarSign, Award } from 'lucide-react'
import Link from 'next/link'

interface Professional {
  id: string; first_name: string; last_name: string; profession: string; status: string
  commission_rate?: number | null; room_hourly_rate?: number | null
}
interface Appointment {
  professional_id: string; status: string; patient_id?: string
}
interface Payment {
  patient_id: string; amount: number; status: string
}
interface Patient {
  id: string; primary_professional_id: string; patient_source?: string
}

interface Props {
  professionals: Professional[]
  appointments: Appointment[]
  payments: Payment[]
  patients: Patient[]
}

export function ProfessionalPerformance({ professionals, appointments, payments, patients }: Props) {
  const stats = useMemo(() => {
    return professionals.filter(p => p.status === 'active').map(prof => {
      const profAppts = appointments.filter(a => a.professional_id === prof.id)
      const completed = profAppts.filter(a => a.status === 'completed').length
      const noShow = profAppts.filter(a => a.status === 'no_show' || a.status === 'absent').length
      const total = profAppts.length
      const attendance = total > 0 ? Math.round((completed / total) * 100) : 0
      const noShowRate = total > 0 ? Math.round((noShow / total) * 100) : 0

      const profPatients = patients.filter(p => p.primary_professional_id === prof.id)
      const patientIds = new Set(profPatients.map(p => p.id))
      const profPayments = payments.filter(p => patientIds.has(p.patient_id) && p.status === 'paid')
      const revenue = profPayments.reduce((acc, p) => acc + Number(p.amount), 0)

      const centerPatients = profPatients.filter(p => p.patient_source === 'center').length
      const ownPatients = profPatients.filter(p => p.patient_source === 'professional').length

      return { prof, completed, noShow, total, attendance, noShowRate, revenue, patientCount: profPatients.length, centerPatients, ownPatients }
    }).sort((a, b) => b.revenue - a.revenue)
  }, [professionals, appointments, payments, patients])

  const topRevenue = stats[0]?.revenue ?? 1

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-teal-50 border-teal-100">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Profesionales activos</p>
            <p className="text-2xl font-bold text-teal-700">{stats.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Turnos realizados</p>
            <p className="text-2xl font-bold text-green-700">{stats.reduce((a, s) => a + s.completed, 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Ingresos totales</p>
            <p className="text-2xl font-bold text-blue-700">${stats.reduce((a, s) => a + s.revenue, 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
        <Card className="bg-rose-50 border-rose-100">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Ausentismo promedio</p>
            <p className="text-2xl font-bold text-rose-700">
              {stats.length > 0 ? Math.round(stats.reduce((a, s) => a + s.noShowRate, 0) / stats.length) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        {stats.map((s, i) => (
          <Card key={s.prof.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-start gap-4">
                {/* Rank + name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-200 text-gray-600' : i === 2 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {i === 0 ? <Award className="h-4 w-4" /> : i + 1}
                  </div>
                  <div className="min-w-0">
                    <Link href={`/professionals/${s.prof.id}`} className="font-semibold text-gray-800 hover:text-teal-600 hover:underline transition-colors">
                      {s.prof.last_name}, {s.prof.first_name}
                    </Link>
                    <p className="text-xs text-gray-400">{s.prof.profession}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm flex-1">
                  <div>
                    <p className="text-xs text-gray-400 flex items-center gap-1"><Users className="h-3 w-3" />Pacientes</p>
                    <p className="font-semibold">{s.patientCount}</p>
                    {(s.centerPatients > 0 || s.ownPatients > 0) && (
                      <p className="text-xs text-gray-400">{s.centerPatients} centro · {s.ownPatients} propios</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Realizados</p>
                    <p className="font-semibold">{s.completed} <span className="text-gray-400 font-normal text-xs">/ {s.total}</span></p>
                    <p className="text-xs text-green-600">{s.attendance}% asistencia</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 flex items-center gap-1"><UserX className="h-3 w-3" />Ausentismo</p>
                    <p className={`font-semibold ${s.noShowRate > 20 ? 'text-red-600' : s.noShowRate > 10 ? 'text-amber-600' : 'text-gray-700'}`}>
                      {s.noShow} <span className="text-xs font-normal">({s.noShowRate}%)</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 flex items-center gap-1"><DollarSign className="h-3 w-3" />Ingresos</p>
                    <p className="font-semibold text-green-700">${s.revenue.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
                  </div>
                </div>
              </div>

              {/* Revenue bar */}
              {s.revenue > 0 && (
                <div className="mt-3">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-all duration-700"
                      style={{ width: `${(s.revenue / topRevenue) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {stats.length === 0 && (
          <Card><CardContent className="p-8 text-center text-gray-400">No hay datos de profesionales activos.</CardContent></Card>
        )}
      </div>
    </div>
  )
}
