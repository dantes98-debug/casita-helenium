'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

const TYPE_LABELS: Record<string, string> = {
  session_percentage: 'Porcentaje por sesión',
  fixed_fee: 'Honorario fijo mensual',
  hourly_rental: 'Alquiler por hora',
  monthly_rental: 'Alquiler mensual',
  fixed_blocks: 'Bloques fijos',
  mixed: 'Mixto',
  custom: 'Personalizado',
}

export default function NewAgreementPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const professionalId = params.id

  const [type, setType] = useState('session_percentage')
  const [centerPercentage, setCenterPercentage] = useState('')
  const [sessionValue, setSessionValue] = useState('')
  const [roomHourlyValue, setRoomHourlyValue] = useState('')
  const [monthlyValue, setMonthlyValue] = useState('')
  const [fixedFee, setFixedFee] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [observations, setObservations] = useState('')
  const [saving, setSaving] = useState(false)

  const professionalPercentage = centerPercentage ? String(100 - Number(centerPercentage)) : ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()

    const payload: Record<string, unknown> = {
      professional_id: professionalId,
      type,
      status: 'active',
      start_date: startDate,
      end_date: endDate || null,
      observations: observations.trim() || null,
    }

    if (type === 'session_percentage') {
      payload.center_percentage = centerPercentage ? Number(centerPercentage) / 100 : null
      payload.professional_percentage = professionalPercentage ? Number(professionalPercentage) / 100 : null
      if (sessionValue) payload.session_value = Number(sessionValue)
    } else if (type === 'hourly_rental') {
      payload.room_hourly_value = roomHourlyValue ? Number(roomHourlyValue) : null
    } else if (type === 'monthly_rental') {
      payload.monthly_value = monthlyValue ? Number(monthlyValue) : null
    } else if (type === 'fixed_fee') {
      payload.fixed_fee = fixedFee ? Number(fixedFee) : null
    } else if (type === 'mixed') {
      if (centerPercentage) payload.center_percentage = Number(centerPercentage) / 100
      if (professionalPercentage) payload.professional_percentage = Number(professionalPercentage) / 100
      if (roomHourlyValue) payload.room_hourly_value = Number(roomHourlyValue)
    }

    const { error } = await supabase.from('professional_agreements').insert(payload)
    setSaving(false)
    if (error) { toast.error('Error al guardar: ' + error.message); return }

    // Sync commission_rate to professionals table for liquidación
    if ((type === 'session_percentage' || type === 'mixed') && centerPercentage) {
      await supabase.from('professionals').update({
        commission_rate: Number(centerPercentage) / 100,
        room_hourly_rate: roomHourlyValue ? Number(roomHourlyValue) : undefined,
      }).eq('id', professionalId)
    }

    toast.success('Acuerdo creado')
    router.push(`/professionals/${professionalId}`)
  }

  return (
    <div className="p-6 max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/professionals/${professionalId}`}><ArrowLeft className="h-4 w-4 mr-1" />Volver</Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Nuevo acuerdo económico</h1>
          <p className="text-gray-500 text-sm">Define cómo se liquida al profesional</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Condiciones del acuerdo</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Tipo de acuerdo *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {(type === 'session_percentage' || type === 'mixed') && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>% del centro</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" min="0" max="100" value={centerPercentage}
                      onChange={e => setCenterPercentage(e.target.value)} placeholder="30" />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>% del profesional</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" value={professionalPercentage} readOnly className="bg-gray-50" />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Valor de sesión de referencia (opcional)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">$</span>
                    <Input type="number" value={sessionValue} onChange={e => setSessionValue(e.target.value)} placeholder="Valor típico de sesión" />
                  </div>
                </div>
              </div>
            )}

            {(type === 'hourly_rental' || type === 'mixed') && (
              <div className="space-y-1">
                <Label>Valor por hora de consultorio</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">$</span>
                  <Input type="number" value={roomHourlyValue} onChange={e => setRoomHourlyValue(e.target.value)} placeholder="Ej: 2000" />
                </div>
              </div>
            )}

            {type === 'monthly_rental' && (
              <div className="space-y-1">
                <Label>Valor mensual fijo</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">$</span>
                  <Input type="number" value={monthlyValue} onChange={e => setMonthlyValue(e.target.value)} placeholder="Ej: 50000" />
                </div>
              </div>
            )}

            {type === 'fixed_fee' && (
              <div className="space-y-1">
                <Label>Honorario fijo mensual</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">$</span>
                  <Input type="number" value={fixedFee} onChange={e => setFixedFee(e.target.value)} placeholder="Ej: 80000" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Vigencia desde *</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Vigencia hasta <span className="text-gray-400 font-normal">(opcional)</span></Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Observaciones</Label>
              <Textarea value={observations} onChange={e => setObservations(e.target.value)}
                rows={2} placeholder="Notas adicionales sobre el acuerdo..." />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar acuerdo
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
