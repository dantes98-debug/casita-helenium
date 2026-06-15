'use client'

import { useState } from 'react'
import { Debt } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { format, isPast } from 'date-fns'
import { Search, CheckCircle, DollarSign, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type DebtRow = Debt & {
  patient?: { first_name: string; last_name: string } | null
  professional?: { first_name: string; last_name: string } | null
}

const statusLabels: Record<string, string> = {
  active: 'Activa', partially_paid: 'Parcial', paid: 'Pagada', written_off: 'Incobrable',
}
const statusColors: Record<string, string> = {
  active: 'bg-red-100 text-red-700', partially_paid: 'bg-orange-100 text-orange-700',
  paid: 'bg-green-100 text-green-700', written_off: 'bg-gray-100 text-gray-500',
}

export function DebtsTable({ debts }: { debts: DebtRow[] }) {
  const [search, setSearch] = useState('')
  const [payDebt, setPayDebt] = useState<DebtRow | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [paying, setPaying] = useState(false)
  const router = useRouter()

  const filtered = debts.filter(d => {
    const name = `${d.patient?.first_name ?? ''} ${d.patient?.last_name ?? ''} ${d.concept}`.toLowerCase()
    return name.includes(search.toLowerCase())
  })

  async function markPaid(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('debts').update({ status: 'paid' }).eq('id', id)
    if (error) { toast.error('Error'); return }
    toast.success('Deuda marcada como pagada')
    router.refresh()
  }

  async function submitPartialPay() {
    if (!payDebt) return
    const amount = parseFloat(payAmount)
    if (isNaN(amount) || amount <= 0) { toast.error('Monto inválido'); return }
    setPaying(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Registrar pago
    const { error: payError } = await supabase.from('payments').insert({
      concept: `Pago parcial: ${payDebt.concept}`,
      amount,
      payment_method: 'cash',
      date: new Date().toISOString().split('T')[0],
      status: 'paid',
      patient_id: payDebt.patient_id,
      registered_by: user?.id,
    })
    if (payError) { toast.error('Error al registrar pago'); setPaying(false); return }

    // Actualizar estado de deuda
    const remaining = payDebt.amount - amount
    const newStatus = remaining <= 0 ? 'paid' : 'partially_paid'
    await supabase.from('debts').update({ status: newStatus, amount: Math.max(0, remaining) }).eq('id', payDebt.id)

    toast.success(remaining <= 0 ? 'Deuda saldada completamente' : `Pago parcial registrado. Saldo restante: $${remaining.toLocaleString('es-AR')}`)
    setPaying(false)
    setPayDebt(null)
    setPayAmount('')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input placeholder="Buscar por paciente o concepto..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Deudor</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Concepto</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Monto</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Vencimiento</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin deudas registradas</td></tr>
                ) : filtered.map(d => {
                  const isOverdue = d.due_date && isPast(new Date(d.due_date)) && d.status === 'active'
                  return (
                    <tr key={d.id} className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50/50' : ''}`}>
                      <td className="px-4 py-3 font-medium">
                        {d.patient ? `${d.patient.last_name}, ${d.patient.first_name}` : d.professional ? `Prof. ${d.professional.last_name}` : '—'}
                      </td>
                      <td className="px-4 py-3">{d.concept}</td>
                      <td className="px-4 py-3 font-semibold">${d.amount.toLocaleString('es-AR')}</td>
                      <td className="px-4 py-3">
                        {d.due_date ? (
                          <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                            {format(new Date(d.due_date), 'dd/MM/yyyy')}
                            {isOverdue && ' ⚠️'}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${statusColors[d.status]}`}>{statusLabels[d.status]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right flex justify-end gap-1">
                        {(d.status === 'active' || d.status === 'partially_paid') && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => { setPayDebt(d); setPayAmount(String(d.amount)) }} title="Registrar pago">
                              <DollarSign className="h-4 w-4 text-teal-600" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => markPaid(d.id)} title="Marcar como pagada">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!payDebt} onOpenChange={open => { if (!open) { setPayDebt(null); setPayAmount('') } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar pago</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium">{payDebt?.patient ? `${payDebt.patient.last_name}, ${payDebt.patient.first_name}` : '—'}</span>
              <br />{payDebt?.concept}
            </p>
            <div className="space-y-1">
              <Label>Monto a cobrar (deuda total: ${payDebt?.amount.toLocaleString('es-AR')})</Label>
              <Input
                type="number"
                step="0.01"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-gray-400">Podés ingresar un monto parcial o el total.</p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setPayDebt(null); setPayAmount('') }}>Cancelar</Button>
              <Button className="bg-teal-600 hover:bg-teal-700" onClick={submitPartialPay} disabled={paying}>
                {paying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar pago
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
