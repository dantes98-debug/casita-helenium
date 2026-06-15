'use client'

import { useState } from 'react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { DollarSign, Clock, CheckCircle, Edit2, Loader2, Download } from 'lucide-react'

interface Professional {
  id: string
  first_name: string
  last_name: string
  profession: string
  room_hourly_rate?: number | null
}

interface Booking {
  id: string
  room_id: string
  professional_id: string
  start_time: string
  end_time: string
  hours_used: number
  status: string
  billed: boolean
  room?: { name: string } | null
  professional?: { first_name: string; last_name: string; room_hourly_rate?: number | null } | null
}

interface Props {
  bookings: Booking[]
  professionals: Professional[]
}

export function RoomBilling({ bookings, professionals }: Props) {
  const router = useRouter()
  const [period, setPeriod] = useState(format(new Date(), 'yyyy-MM'))
  const [editProf, setEditProf] = useState<Professional | null>(null)
  const [newRate, setNewRate] = useState('')
  const [saving, setSaving] = useState(false)

  const periodStart = format(startOfMonth(new Date(period + '-01')), 'yyyy-MM-dd')
  const periodEnd = format(endOfMonth(new Date(period + '-01')), 'yyyy-MM-dd')

  const periodBookings = bookings.filter(b =>
    b.status === 'confirmed' &&
    b.start_time >= periodStart &&
    b.start_time <= periodEnd + 'T23:59:59Z'
  )

  // Group by professional
  const byProfessional = professionals.map(prof => {
    const profBookings = periodBookings.filter(b => b.professional_id === prof.id)
    const totalHours = profBookings.reduce((acc, b) => acc + Number(b.hours_used), 0)
    const rate = prof.room_hourly_rate ?? 0
    const totalAmount = totalHours * rate
    const billedHours = profBookings.filter(b => b.billed).reduce((acc, b) => acc + Number(b.hours_used), 0)
    const pendingHours = totalHours - billedHours
    return { prof, profBookings, totalHours, totalAmount, billedHours, pendingHours, rate }
  }).filter(x => x.profBookings.length > 0 || true) // show all so admin can see rates

  const grandTotal = byProfessional.reduce((acc, x) => acc + x.totalAmount, 0)
  const pendingTotal = byProfessional.reduce((acc, x) => acc + x.pendingHours * x.rate, 0)

  async function markAllBilled(profId: string) {
    const supabase = createClient()
    const ids = periodBookings.filter(b => b.professional_id === profId && !b.billed).map(b => b.id)
    if (ids.length === 0) { toast.info('No hay reservas pendientes de facturar'); return }
    const { error } = await supabase.from('room_bookings').update({ billed: true }).in('id', ids)
    if (error) { toast.error('Error'); return }
    toast.success(`${ids.length} reserva(s) marcadas como facturadas`)
    router.refresh()
  }

  async function saveRate() {
    if (!editProf) return
    const rate = parseFloat(newRate)
    if (isNaN(rate) || rate < 0) { toast.error('Monto inválido'); return }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('professionals').update({ room_hourly_rate: rate }).eq('id', editProf.id)
    setSaving(false)
    if (error) { toast.error('Error al guardar tarifa'); return }
    toast.success(`Tarifa actualizada: $${rate}/h para ${editProf.last_name}`)
    setEditProf(null)
    router.refresh()
  }

  function exportCSV() {
    const rows = [
      ['Profesional', 'Consultorio', 'Fecha', 'Hora inicio', 'Hora fin', 'Horas', 'Tarifa/h', 'Subtotal', 'Facturado'],
      ...periodBookings.map(b => {
        const prof = professionals.find(p => p.id === b.professional_id)
        const rate = prof?.room_hourly_rate ?? 0
        return [
          `${prof?.last_name ?? ''}, ${prof?.first_name ?? ''}`,
          b.room?.name ?? '',
          format(new Date(b.start_time), 'dd/MM/yyyy'),
          format(new Date(b.start_time), 'HH:mm'),
          format(new Date(b.end_time), 'HH:mm'),
          Number(b.hours_used).toFixed(2),
          rate.toString(),
          (Number(b.hours_used) * rate).toFixed(2),
          b.billed ? 'Sí' : 'No',
        ]
      }),
    ]
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `facturacion_consultorios_${period}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Period selector + summary */}
      <div className="flex flex-wrap items-end gap-4 justify-between">
        <div className="space-y-1">
          <Label>Período</Label>
          <Input type="month" value={period} onChange={e => setPeriod(e.target.value)} className="w-44" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} disabled={periodBookings.length === 0}>
            <Download className="h-4 w-4 mr-2" />Exportar CSV
          </Button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="bg-teal-50 border-teal-100">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Total horas usadas</p>
            <p className="text-2xl font-bold text-teal-700">
              {byProfessional.reduce((acc, x) => acc + x.totalHours, 0).toFixed(1)}h
            </p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Total a cobrar</p>
            <p className="text-2xl font-bold text-green-700">${grandTotal.toLocaleString('es-AR')}</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-100">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase">Pendiente de facturar</p>
            <p className="text-2xl font-bold text-orange-700">${pendingTotal.toLocaleString('es-AR')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Per professional breakdown */}
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-700">Detalle por profesional</h2>
        {byProfessional.map(({ prof, profBookings, totalHours, totalAmount, billedHours, pendingHours, rate }) => (
          <Card key={prof.id} className={profBookings.length === 0 ? 'opacity-50' : ''}>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{prof.last_name}, {prof.first_name}</span>
                    <span className="text-xs text-gray-400">{prof.profession}</span>
                    <button
                      onClick={() => { setEditProf(prof); setNewRate(String(rate || '')) }}
                      className="flex items-center gap-1 text-xs text-teal-600 hover:underline"
                    >
                      <Edit2 className="h-3 w-3" />
                      {rate ? `$${rate}/h` : 'Sin tarifa — fijar'}
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">Horas usadas</p>
                      <p className="font-semibold flex items-center gap-1"><Clock className="h-3 w-3 text-gray-400" />{totalHours.toFixed(1)}h</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Total a cobrar</p>
                      <p className="font-semibold text-green-700 flex items-center gap-1"><DollarSign className="h-3 w-3" />${totalAmount.toLocaleString('es-AR')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Facturado</p>
                      <p className="font-semibold text-blue-600">{billedHours.toFixed(1)}h · ${(billedHours * rate).toLocaleString('es-AR')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Pendiente</p>
                      <p className={`font-semibold ${pendingHours > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                        {pendingHours.toFixed(1)}h · ${(pendingHours * rate).toLocaleString('es-AR')}
                      </p>
                    </div>
                  </div>

                  {/* Booking detail */}
                  {profBookings.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {profBookings.map(b => (
                        <div key={b.id} className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="font-medium text-gray-700">{format(new Date(b.start_time), 'dd/MM')}</span>
                          <span>{b.room?.name}</span>
                          <span>{format(new Date(b.start_time), 'HH:mm')}–{format(new Date(b.end_time), 'HH:mm')}</span>
                          <span className="font-medium">({Number(b.hours_used).toFixed(1)}h)</span>
                          {b.billed && <Badge className="text-[10px] bg-green-100 text-green-700 px-1">Facturado</Badge>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {pendingHours > 0 && (
                  <Button size="sm" variant="outline" className="text-green-600 border-green-300 hover:bg-green-50" onClick={() => markAllBilled(prof.id)}>
                    <CheckCircle className="h-4 w-4 mr-1" />Marcar facturado
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit rate dialog */}
      <Dialog open={!!editProf} onOpenChange={open => { if (!open) setEditProf(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Tarifa por hora — {editProf?.last_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Monto por hora (ARS)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newRate}
                  onChange={e => setNewRate(e.target.value)}
                  className="pl-6"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-gray-400">Este valor se usa para calcular lo que debe pagar por el uso del consultorio.</p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setEditProf(null)}>Cancelar</Button>
              <Button className="bg-teal-600 hover:bg-teal-700" onClick={saveRate} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar tarifa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
