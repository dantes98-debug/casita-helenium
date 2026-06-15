'use client'

import { useState } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  DollarSign, Users, Building2, Edit2, Loader2,
  TrendingUp, ArrowRightLeft, Download, Info
} from 'lucide-react'

interface Patient {
  id: string
  first_name: string
  last_name: string
  patient_source: 'center' | 'professional'
  status: string
}

interface Payment {
  id: string
  amount: number
  payment_date: string
  patient_id: string
  status: string
}

interface RoomBooking {
  id: string
  hours_used: number
  billed: boolean
  start_time: string
}

interface Professional {
  id: string
  first_name: string
  last_name: string
  profession: string
  commission_rate: number | null
  room_hourly_rate: number | null
}

interface Props {
  professional: Professional
  patients: Patient[]
  payments: Payment[]
  roomBookings: RoomBooking[]
}

export function ProfessionalLiquidation({ professional, patients, payments, roomBookings }: Props) {
  const router = useRouter()
  const [period, setPeriod] = useState(format(new Date(), 'yyyy-MM'))
  const [editingCommission, setEditingCommission] = useState(false)
  const [editingRate, setEditingRate] = useState(false)
  const [newCommission, setNewCommission] = useState(String(Math.round((professional.commission_rate ?? 0.30) * 100)))
  const [newRate, setNewRate] = useState(String(professional.room_hourly_rate ?? ''))
  const [saving, setSaving] = useState(false)

  const periodStart = startOfMonth(new Date(period + '-01'))
  const periodEnd = endOfMonth(new Date(period + '-01'))

  // Payments in period
  const periodPayments = payments.filter(p => {
    const d = new Date(p.payment_date)
    return d >= periodStart && d <= periodEnd && p.status === 'paid'
  })

  // Center patients (commission applies)
  const centerPatients = patients.filter(p => p.patient_source === 'center')
  const ownPatients = patients.filter(p => p.patient_source === 'professional')

  const commissionRate = professional.commission_rate ?? 0.30
  const hourlyRate = professional.room_hourly_rate ?? 0

  // Revenue from center patients in period
  const centerPatientIds = new Set(centerPatients.map(p => p.id))
  const centerPaymentsTotal = periodPayments
    .filter(p => centerPatientIds.has(p.patient_id))
    .reduce((acc, p) => acc + Number(p.amount), 0)

  const centerToProf = centerPaymentsTotal * (1 - commissionRate)
  const centerToCenter = centerPaymentsTotal * commissionRate

  // Revenue from own patients in period
  const ownPatientIds = new Set(ownPatients.map(p => p.id))
  const ownPaymentsTotal = periodPayments
    .filter(p => ownPatientIds.has(p.patient_id))
    .reduce((acc, p) => acc + Number(p.amount), 0)

  // Room charges in period
  const periodBookings = roomBookings.filter(b => {
    const d = new Date(b.start_time)
    return d >= periodStart && d <= periodEnd
  })
  const totalHours = periodBookings.reduce((acc, b) => acc + Number(b.hours_used), 0)
  const roomCharges = totalHours * hourlyRate

  // What the professional earns net
  const profEarnings = centerToProf + ownPaymentsTotal - roomCharges
  // What the center earns from this professional
  const centerEarnings = centerToCenter + roomCharges

  async function saveCommission() {
    const rate = parseFloat(newCommission) / 100
    if (isNaN(rate) || rate < 0 || rate > 1) { toast.error('Porcentaje inválido (0-100)'); return }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('professionals').update({ commission_rate: rate }).eq('id', professional.id)
    setSaving(false)
    if (error) { toast.error('Error al guardar'); return }
    toast.success(`Comisión actualizada: ${newCommission}% para el centro`)
    setEditingCommission(false)
    router.refresh()
  }

  async function saveRate() {
    const rate = parseFloat(newRate)
    if (isNaN(rate) || rate < 0) { toast.error('Tarifa inválida'); return }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('professionals').update({ room_hourly_rate: rate }).eq('id', professional.id)
    setSaving(false)
    if (error) { toast.error('Error al guardar'); return }
    toast.success(`Tarifa actualizada: $${rate}/h`)
    setEditingRate(false)
    router.refresh()
  }

  function exportCSV() {
    const rows = [
      ['Período', 'Origen paciente', 'Paciente', 'Cobrado', 'Para profesional', 'Para centro'],
      ...periodPayments.map(p => {
        const patient = patients.find(pt => pt.id === p.patient_id)
        const isCenter = patient?.patient_source === 'center'
        const toProf = isCenter ? Number(p.amount) * (1 - commissionRate) : Number(p.amount)
        const toCenter = isCenter ? Number(p.amount) * commissionRate : 0
        return [
          format(new Date(p.payment_date), 'dd/MM/yyyy'),
          isCenter ? 'Centro' : 'Propio',
          patient ? `${patient.last_name}, ${patient.first_name}` : 'Desconocido',
          Number(p.amount).toFixed(2),
          toProf.toFixed(2),
          toCenter.toFixed(2),
        ]
      }),
      ['', '', 'CONSULTORIOS', '', `-${roomCharges.toFixed(2)}`, roomCharges.toFixed(2)],
      ['', '', 'TOTAL NETO', '', profEarnings.toFixed(2), centerEarnings.toFixed(2)],
    ]
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `liquidacion_${professional.last_name}_${period}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      {/* Config row */}
      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div className="space-y-1">
          <Label>Período</Label>
          <Input type="month" value={period} onChange={e => setPeriod(e.target.value)} className="w-44" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setEditingCommission(true)}
            className="flex items-center gap-1.5 text-sm text-teal-600 border border-teal-200 rounded-lg px-3 py-1.5 hover:bg-teal-50 transition-colors"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Comisión centro: <strong>{Math.round(commissionRate * 100)}%</strong>
            <Edit2 className="h-3 w-3 ml-1" />
          </button>
          <button
            onClick={() => setEditingRate(true)}
            className="flex items-center gap-1.5 text-sm text-amber-600 border border-amber-200 rounded-lg px-3 py-1.5 hover:bg-amber-50 transition-colors"
          >
            <Building2 className="h-3.5 w-3.5" />
            Consultorio: <strong>{hourlyRate ? `$${hourlyRate}/h` : 'sin tarifa'}</strong>
            <Edit2 className="h-3 w-3 ml-1" />
          </button>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={periodPayments.length === 0 && periodBookings.length === 0}>
            <Download className="h-4 w-4 mr-1" />CSV
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-teal-50 border-teal-100">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">El prof. recibe</p>
            <p className="text-2xl font-bold text-teal-700">${profEarnings.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
            <p className="text-xs text-gray-400 mt-1">neto del período</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Centro recibe</p>
            <p className="text-2xl font-bold text-green-700">${centerEarnings.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
            <p className="text-xs text-gray-400 mt-1">comisión + consultorio</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Cobrado total</p>
            <p className="text-2xl font-bold text-blue-700">${(centerPaymentsTotal + ownPaymentsTotal).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
            <p className="text-xs text-gray-400 mt-1">{periodPayments.length} pagos</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Hs. consultorio</p>
            <p className="text-2xl font-bold text-amber-700">{totalHours.toFixed(1)}h</p>
            <p className="text-xs text-gray-400 mt-1">${roomCharges.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Center patients */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-700">Centro</Badge>
              Pacientes derivados por el centro
              <span className="text-gray-400 font-normal">({centerPatients.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-blue-50 rounded-lg p-2">
              <Info className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
              El centro se queda con el {Math.round(commissionRate * 100)}% de lo cobrado
            </div>
            {centerPatients.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Sin pacientes del centro</p>
            ) : centerPatients.map(p => {
              const patPayments = periodPayments.filter(pm => pm.patient_id === p.id)
              const total = patPayments.reduce((acc, pm) => acc + Number(pm.amount), 0)
              const toProf = total * (1 - commissionRate)
              const toCenter = total * commissionRate
              return (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{p.last_name}, {p.first_name}</p>
                    <p className="text-xs text-gray-400">{patPayments.length} pago(s)</p>
                  </div>
                  {total > 0 ? (
                    <div className="text-right text-xs">
                      <p className="text-teal-600 font-medium">Prof: ${toProf.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
                      <p className="text-green-600">Centro: ${toCenter.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">Sin cobros este período</p>
                  )}
                </div>
              )
            })}
            {centerPaymentsTotal > 0 && (
              <div className="pt-2 border-t flex justify-between text-sm font-semibold">
                <span>Total derivados</span>
                <div className="text-right">
                  <span className="text-teal-600">${centerToProf.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                  <span className="text-gray-400 mx-1">/</span>
                  <span className="text-green-600">${centerToCenter.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Own patients */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Badge className="bg-violet-100 text-violet-700">Propio</Badge>
              Pacientes del profesional
              <span className="text-gray-400 font-normal">({ownPatients.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-violet-50 rounded-lg p-2">
              <Info className="h-3.5 w-3.5 text-violet-400 flex-shrink-0" />
              Sin comisión — solo paga el uso del consultorio
            </div>
            {ownPatients.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Sin pacientes propios</p>
            ) : ownPatients.map(p => {
              const patPayments = periodPayments.filter(pm => pm.patient_id === p.id)
              const total = patPayments.reduce((acc, pm) => acc + Number(pm.amount), 0)
              return (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{p.last_name}, {p.first_name}</p>
                    <p className="text-xs text-gray-400">{patPayments.length} pago(s)</p>
                  </div>
                  {total > 0 ? (
                    <p className="text-sm font-medium text-violet-600">${total.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
                  ) : (
                    <p className="text-xs text-gray-400">Sin cobros</p>
                  )}
                </div>
              )
            })}
            {ownPaymentsTotal > 0 && (
              <div className="pt-2 border-t flex justify-between text-sm font-semibold">
                <span>Total propio</span>
                <span className="text-violet-600">${ownPaymentsTotal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Room bookings summary */}
      {periodBookings.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4 text-amber-500" />
              Uso de consultorios — {period}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {periodBookings.map(b => (
                <div key={b.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <span className="text-gray-500">{format(new Date(b.start_time), 'dd/MM HH:mm')}</span>
                  <span>{Number(b.hours_used).toFixed(1)}h</span>
                  <span className="text-amber-600 font-medium">${(Number(b.hours_used) * hourlyRate).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                </div>
              ))}
              <div className="pt-2 border-t flex justify-between font-semibold text-sm">
                <span>Total consultorios ({totalHours.toFixed(1)}h × ${hourlyRate}/h)</span>
                <span className="text-amber-600">-${roomCharges.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit commission dialog */}
      <Dialog open={editingCommission} onOpenChange={setEditingCommission}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Comisión del centro — {professional.last_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>% que retiene el centro (de los pacientes derivados)</Label>
              <div className="relative">
                <Input
                  type="number" min="0" max="100" step="1"
                  value={newCommission}
                  onChange={e => setNewCommission(e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
              </div>
              <p className="text-xs text-gray-400">
                Ej: 30 → el centro se queda 30%, el profesional recibe 70%
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setEditingCommission(false)}>Cancelar</Button>
              <Button className="bg-teal-600 hover:bg-teal-700" onClick={saveCommission} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit hourly rate dialog */}
      <Dialog open={editingRate} onOpenChange={setEditingRate}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Tarifa de consultorio — {professional.last_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Monto por hora (ARS)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <Input type="number" step="0.01" min="0" value={newRate} onChange={e => setNewRate(e.target.value)} className="pl-6" />
              </div>
              <p className="text-xs text-gray-400">Solo aplica a pacientes propios del profesional.</p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setEditingRate(false)}>Cancelar</Button>
              <Button className="bg-teal-600 hover:bg-teal-700" onClick={saveRate} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
