'use client'

import { useState } from 'react'
import { Settlement } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Loader2, CheckCircle, Eye } from 'lucide-react'

type SettlementRow = Settlement & {
  professional?: { first_name: string; last_name: string; profession: string } | null
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700', generated: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700', disputed: 'bg-red-100 text-red-700',
}
const statusLabels: Record<string, string> = {
  pending: 'Pendiente', generated: 'Generada', paid: 'Pagada', disputed: 'Disputada',
}

const generateSchema = z.object({
  professional_id: z.string().uuid('Seleccioná un profesional'),
  period_start: z.string().min(1, 'Fecha inicio requerida'),
  period_end: z.string().min(1, 'Fecha fin requerida'),
  manual_adjustments: z.coerce.number().default(0),
  bonuses: z.coerce.number().default(0),
  observations: z.string().optional(),
})
type GenerateForm = z.infer<typeof generateSchema>

interface Props {
  settlements: SettlementRow[]
  professionals: { id: string; first_name: string; last_name: string; profession: string }[]
}

export function SettlementsView({ settlements: initialSettlements, professionals }: Props) {
  const [settlements, setSettlements] = useState(initialSettlements)
  const [open, setOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [filterProfId, setFilterProfId] = useState('__all__')
  const router = useRouter()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<GenerateForm>({
    resolver: zodResolver(generateSchema) as any,
    defaultValues: {
      period_start: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
      period_end: format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), 'yyyy-MM-dd'),
      manual_adjustments: 0, bonuses: 0,
    },
  })

  async function onGenerate(data: GenerateForm) {
    setGenerating(true)
    const supabase = createClient()

    // Load appointments and payments for this professional in the period
    const [{ data: completedAppts }, { data: payments }, { data: agreement }] = await Promise.all([
      supabase.from('appointments').select('id, value, payment_status')
        .eq('professional_id', data.professional_id).eq('status', 'completed')
        .gte('start_time', data.period_start).lte('start_time', data.period_end + 'T23:59:59Z'),
      supabase.from('payments').select('amount, status')
        .eq('professional_id', data.professional_id).is('deleted_at', null)
        .gte('date', data.period_start).lte('date', data.period_end),
      supabase.from('professional_agreements').select('*').eq('professional_id', data.professional_id).eq('status', 'active').single(),
    ])

    const sessions = completedAppts?.length ?? 0
    const totalBilled = completedAppts?.reduce((acc, a) => acc + (a.value ?? 0), 0) ?? 0
    const sessionsPaid = completedAppts?.filter(a => a.payment_status === 'paid').length ?? 0
    const totalCollected = completedAppts?.filter(a => a.payment_status === 'paid').reduce((acc, a) => acc + (a.value ?? 0), 0) ?? 0
    const totalPending = totalBilled - totalCollected

    const profPct = agreement?.professional_percentage ?? 70
    const centerPct = agreement?.center_percentage ?? 30
    const professionalAmount = totalCollected * (profPct / 100)
    const centerAmount = totalCollected * (centerPct / 100)
    const roomRental = agreement?.type === 'hourly_rental' ? (sessions * (agreement.room_hourly_value ?? 0)) : 0
    const totalToPay = professionalAmount + data.bonuses
    const totalOwedToCenter = roomRental
    const netTotal = totalToPay - totalOwedToCenter - data.manual_adjustments

    const { data: created, error } = await supabase.from('settlements').insert({
      professional_id: data.professional_id,
      period_start: data.period_start, period_end: data.period_end,
      sessions_completed: sessions, sessions_paid: sessionsPaid, sessions_pending: sessions - sessionsPaid,
      total_billed: totalBilled, total_collected: totalCollected, total_pending: totalPending,
      center_amount: centerAmount, professional_amount: professionalAmount,
      room_rental: roomRental, manual_adjustments: data.manual_adjustments,
      bonuses: data.bonuses, total_to_pay: totalToPay,
      total_owed_to_center: totalOwedToCenter, net_total: netTotal,
      status: 'generated', observations: data.observations,
    }).select(`*, professional:professionals(first_name, last_name, profession)`).single()

    setGenerating(false)
    if (error) { toast.error('Error al generar liquidación'); return }
    setSettlements(prev => [created as SettlementRow, ...prev])
    toast.success('Liquidación generada exitosamente')
    setOpen(false)
  }

  async function markPaid(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('settlements').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast.error('Error'); return }
    setSettlements(prev => prev.map(s => s.id === id ? { ...s, status: 'paid' as const } : s))
    toast.success('Liquidación marcada como pagada')
  }

  const filtered = filterProfId === '__all__' ? settlements : settlements.filter(s => s.professional_id === filterProfId)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={filterProfId} onValueChange={setFilterProfId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Todos los profesionales" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los profesionales</SelectItem>
              {professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.last_name}, {p.first_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { reset(); setOpen(true) }} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="h-4 w-4 mr-2" />Generar liquidación
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Profesional</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Período</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Sesiones</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Facturado</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">A cobrar</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Neto</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Sin liquidaciones generadas</td></tr>
                ) : filtered.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      {s.professional?.last_name}, {s.professional?.first_name}
                      <p className="text-xs text-gray-400">{s.professional?.profession}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {format(new Date(s.period_start), 'dd/MM/yy')} - {format(new Date(s.period_end), 'dd/MM/yy')}
                    </td>
                    <td className="px-4 py-3">{s.sessions_completed} ({s.sessions_paid} cobradas)</td>
                    <td className="px-4 py-3">${s.total_billed.toLocaleString('es-AR')}</td>
                    <td className="px-4 py-3 font-semibold text-teal-700">${s.total_to_pay.toLocaleString('es-AR')}</td>
                    <td className="px-4 py-3 font-semibold">${s.net_total.toLocaleString('es-AR')}</td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs ${statusColors[s.status]}`}>{statusLabels[s.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {s.status === 'generated' && (
                        <Button variant="ghost" size="sm" onClick={() => markPaid(s.id)} title="Marcar pagada">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Generar liquidación</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onGenerate)} className="space-y-4">
            <div className="space-y-1">
              <Label>Profesional *</Label>
              <Select value={watch('professional_id') ?? ''} onValueChange={v => setValue('professional_id', v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.last_name}, {p.first_name} ({p.profession})</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.professional_id && <p className="text-xs text-red-500">{errors.professional_id.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Período inicio</Label>
                <Input type="date" {...register('period_start')} />
              </div>
              <div className="space-y-1">
                <Label>Período fin</Label>
                <Input type="date" {...register('period_end')} />
              </div>
              <div className="space-y-1">
                <Label>Ajustes manuales</Label>
                <Input type="number" step="0.01" {...register('manual_adjustments')} />
              </div>
              <div className="space-y-1">
                <Label>Bonificaciones</Label>
                <Input type="number" step="0.01" {...register('bonuses')} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observaciones</Label>
              <Textarea {...register('observations')} rows={2} />
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={generating}>
                {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

