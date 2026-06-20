'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format, parseISO, isSameDay, isAfter, isBefore } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar, Users, DollarSign, Clock, Building2, History } from 'lucide-react'
import Link from 'next/link'

interface Professional {
  id: string; first_name: string; last_name: string; profession: string
  commission_rate?: number | null; room_hourly_rate?: number | null
}
interface Appointment {
  id: string; patient_id: string; start_time: string; end_time: string
  status: string; notes?: string | null
  patient?: { first_name: string; last_name: string } | null
}
interface Patient {
  id: string; first_name: string; last_name: string
  status: string; patient_source?: string
}
interface Payment {
  id: string; amount: number; date: string; status: string; patient_id: string
}
interface RoomBooking {
  id: string; start_time: string; end_time: string; hours_used: number
  status: string; room?: { name: string } | null
}

interface Props {
  professional: Professional
  appointments: Appointment[]
  patients: Patient[]
  payments: Payment[]
  roomBookings: RoomBooking[]
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  reserved: { label: 'Reservado', cls: 'bg-teal-100 text-teal-700' },
  pending_confirmation: { label: 'Por confirmar', cls: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'Confirmado', cls: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Realizado', cls: 'bg-green-100 text-green-700' },
  absent: { label: 'Ausente', cls: 'bg-red-100 text-red-700' },
  no_show: { label: 'Ausente', cls: 'bg-red-100 text-red-700' },
  cancelled_with_notice: { label: 'Cancelado', cls: 'bg-gray-100 text-gray-500' },
  cancelled_without_notice: { label: 'Cancelado', cls: 'bg-gray-100 text-gray-500' },
  rescheduled: { label: 'Reprogramado', cls: 'bg-purple-100 text-purple-700' },
}

export function PsychologistDashboard({ professional, appointments, patients, payments, roomBookings }: Props) {
  const now = new Date()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const todayAppts = useMemo(() => appointments.filter(a => isSameDay(parseISO(a.start_time), now)), [appointments])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const upcomingAppts = useMemo(() =>
    appointments
      .filter(a => isAfter(parseISO(a.start_time), now) && !a.status.includes('cancelled'))
      .slice(0, 10),
    [appointments]
  )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pastAppts = useMemo(() =>
    appointments
      .filter(a => isBefore(parseISO(a.start_time), now) && !a.status.includes('cancelled'))
      .sort((a, b) => b.start_time.localeCompare(a.start_time))
      .slice(0, 15),
    [appointments]
  )

  const activePatients = patients.filter(p => p.status === 'active')
  const centerPatients = patients.filter(p => p.patient_source === 'center')
  const ownPatients = patients.filter(p => p.patient_source === 'professional')

  const commissionRate = professional.commission_rate ?? 0
  const hasAgreement = (professional.commission_rate ?? 0) > 0 || (professional.room_hourly_rate ?? 0) > 0
  const paidPayments = payments.filter(p => p.status === 'paid')
  const pendingRevenue = payments.filter(p => p.status === 'pending').reduce((a, p) => a + Number(p.amount), 0)

  const centerTotal = paidPayments
    .filter(p => patients.find(pat => pat.id === p.patient_id)?.patient_source === 'center')
    .reduce((a, p) => a + Number(p.amount), 0)

  const ownPaymentsTotal = paidPayments
    .filter(p => patients.find(pat => pat.id === p.patient_id)?.patient_source === 'professional')
    .reduce((a, p) => a + Number(p.amount), 0)

  const myShareCenter = centerTotal * (1 - commissionRate)
  const roomHours = roomBookings.reduce((a, b) => a + Number(b.hours_used || 0), 0)
  const roomCost = roomHours * (professional.room_hourly_rate ?? 0)
  const myNet = myShareCenter + ownPaymentsTotal - roomCost

  const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 0 })
  const hasFinancialData = centerTotal > 0 || ownPaymentsTotal > 0

  return (
    <div className="space-y-6">
      <div>
        <p className="text-gray-500 text-sm capitalize">{format(now, "EEEE d 'de' MMMM", { locale: es })}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-teal-50 border-teal-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><Calendar className="h-4 w-4 text-teal-500" /><p className="text-xs text-gray-500 uppercase">Hoy</p></div>
            <p className="text-2xl font-bold text-teal-700">{todayAppts.length}</p>
            <p className="text-xs text-gray-400">turnos</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><Users className="h-4 w-4 text-blue-500" /><p className="text-xs text-gray-500 uppercase">Pacientes</p></div>
            <p className="text-2xl font-bold text-blue-700">{activePatients.length}</p>
            <p className="text-xs text-gray-400">{centerPatients.length} centro · {ownPatients.length} propios</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4 text-green-500" /><p className="text-xs text-gray-500 uppercase">Este mes</p></div>
            <p className="text-2xl font-bold text-green-700">{hasFinancialData ? `$${fmt(myNet)}` : '—'}</p>
            <p className="text-xs text-gray-400">neto para vos</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><Building2 className="h-4 w-4 text-amber-500" /><p className="text-xs text-gray-500 uppercase">Consultorios</p></div>
            <p className="text-2xl font-bold text-amber-700">{roomHours}h</p>
            <p className="text-xs text-gray-400">horas en consultorio del centro</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agenda de hoy */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-teal-500" />Agenda de hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayAppts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Sin turnos hoy.</p>
            ) : (
              <div className="space-y-2">
                {todayAppts.sort((a, b) => a.start_time.localeCompare(b.start_time)).map(a => {
                  const st = STATUS_LABEL[a.status] ?? { label: a.status, cls: 'bg-gray-100 text-gray-600' }
                  return (
                    <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50">
                      <div className="text-center min-w-[40px]">
                        <p className="text-sm font-bold text-gray-700">{format(parseISO(a.start_time), 'HH:mm')}</p>
                        <p className="text-[10px] text-gray-400">{format(parseISO(a.end_time), 'HH:mm')}</p>
                      </div>
                      <p className="text-sm font-medium text-gray-800 flex-1 truncate">
                        {a.patient ? `${a.patient.last_name}, ${a.patient.first_name}` : 'Paciente'}
                      </p>
                      <Badge className={`text-xs ${st.cls}`}>{st.label}</Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximos turnos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />Próximos turnos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingAppts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Sin turnos próximos.</p>
            ) : (
              <div className="space-y-2">
                {upcomingAppts.map(a => (
                  <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50">
                    <div className="min-w-[80px]">
                      <p className="text-xs font-semibold text-teal-700 capitalize">{format(parseISO(a.start_time), 'EEE d/M', { locale: es })}</p>
                      <p className="text-xs text-gray-400">{format(parseISO(a.start_time), 'HH:mm')}</p>
                    </div>
                    <p className="text-sm text-gray-700 flex-1 truncate">
                      {a.patient ? `${a.patient.last_name}, ${a.patient.first_name}` : 'Paciente'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Liquidación del mes — solo si hay acuerdo configurado o datos reales */}
        {hasFinancialData ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />Liquidación del mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Pacientes del centro ({centerPatients.length})</span>
                  <span>${fmt(centerTotal)}</span>
                </div>
                <div className="flex justify-between text-gray-400 text-xs pl-4">
                  <span>Comisión centro ({Math.round(commissionRate * 100)}%)</span>
                  <span>-${fmt(centerTotal * commissionRate)}</span>
                </div>
                <div className="flex justify-between text-gray-400 text-xs pl-4">
                  <span>Tu parte</span>
                  <span className="text-green-600">+${fmt(myShareCenter)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Pacientes propios ({ownPatients.length})</span>
                  <span className="text-green-600">+${fmt(ownPaymentsTotal)}</span>
                </div>
                {roomCost > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Alquiler consultorios ({roomHours}h)</span>
                    <span className="text-red-500">-${fmt(roomCost)}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between font-semibold text-gray-800">
                  <span>Neto para vos</span>
                  <span className="text-green-700">${fmt(myNet)}</span>
                </div>
                {pendingRevenue > 0 && (
                  <div className="flex justify-between text-amber-600 text-xs">
                    <span>Pendiente de cobro</span>
                    <span>${fmt(pendingRevenue)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-gray-400">
                <DollarSign className="h-4 w-4" />Liquidación del mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400 text-center py-2">Consultá con administración para ver tu liquidación mensual.</p>
            </CardContent>
          </Card>
        )}

        {/* Mis pacientes — link a historia clínica */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />Mis pacientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activePatients.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Sin pacientes asignados.</p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {activePatients.map(p => (
                  <Link key={p.id} href={`/patients/${p.id}/clinical-record`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group">
                    <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-teal-700">{p.first_name[0]}{p.last_name[0]}</span>
                    </div>
                    <span className="text-sm text-gray-700 flex-1 group-hover:text-teal-600 transition-colors">
                      {p.last_name}, {p.first_name}
                    </span>
                    <Badge className={`text-[10px] ${p.patient_source === 'center' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                      {p.patient_source === 'center' ? 'Centro' : 'Propio'}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sesiones del mes */}
      {pastAppts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-gray-500" />Sesiones del mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {pastAppts.map(a => {
                const st = STATUS_LABEL[a.status] ?? { label: a.status, cls: 'bg-gray-100 text-gray-600' }
                return (
                  <Link key={a.id} href={`/patients/${a.patient_id}/clinical-record`}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:bg-teal-50 hover:border-teal-200 transition-colors text-sm">
                    <div className="min-w-[100px]">
                      <p className="text-xs font-semibold text-gray-600 capitalize">{format(parseISO(a.start_time), "EEE d 'de' MMM", { locale: es })}</p>
                      <p className="text-xs text-gray-400">{format(parseISO(a.start_time), 'HH:mm')}</p>
                    </div>
                    <p className="text-sm text-gray-700 flex-1 truncate group-hover:text-teal-700">
                      {a.patient ? `${a.patient.last_name}, ${a.patient.first_name}` : 'Paciente'}
                    </p>
                    <Badge className={`text-xs ${st.cls}`}>{st.label}</Badge>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
