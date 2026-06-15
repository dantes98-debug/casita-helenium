'use client'

import { useState } from 'react'
import { Payment } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { format } from 'date-fns'
import { Search, Trash2, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type PaymentRow = Payment & {
  patient?: { first_name: string; last_name: string } | null
  professional?: { first_name: string; last_name: string } | null
}

const methodLabels: Record<string, string> = {
  cash: 'Efectivo', transfer: 'Transferencia', mercadopago: 'Mercado Pago',
  debit: 'Débito', credit: 'Crédito', other: 'Otro',
}
const statusColors: Record<string, string> = {
  paid: 'bg-green-100 text-green-700', pending: 'bg-yellow-100 text-yellow-700',
  overdue: 'bg-red-100 text-red-700', partial: 'bg-orange-100 text-orange-700',
  discounted: 'bg-purple-100 text-purple-700', cancelled: 'bg-gray-100 text-gray-500',
}
const statusLabels: Record<string, string> = {
  paid: 'Pagado', pending: 'Pendiente', overdue: 'Vencido',
  partial: 'Parcial', discounted: 'Bonificado', cancelled: 'Cancelado',
}

export function PaymentsTable({ payments }: { payments: PaymentRow[] }) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterMethod, setFilterMethod] = useState('all')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const router = useRouter()

  const filtered = payments.filter(p => {
    const name = `${p.patient?.first_name ?? ''} ${p.patient?.last_name ?? ''} ${p.concept}`.toLowerCase()
    return name.includes(search.toLowerCase()) &&
      (filterStatus === 'all' || p.status === filterStatus) &&
      (filterMethod === 'all' || p.payment_method === filterMethod)
  })

  function handleExport() {
    const data = filtered.map(p => ({
      Fecha: format(new Date(p.date), 'dd/MM/yyyy'),
      Paciente: p.patient ? `${p.patient.last_name}, ${p.patient.first_name}` : '',
      Concepto: p.concept,
      Monto: p.amount,
      'Medio de pago': methodLabels[p.payment_method] ?? p.payment_method,
      Estado: statusLabels[p.status] ?? p.status,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Pagos')
    XLSX.writeFile(wb, `pagos_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  async function handleDeleteConfirmed(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('payments').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Pago eliminado')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Buscar por paciente o concepto..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterMethod} onValueChange={setFilterMethod}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Medio" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los medios</SelectItem>
            {Object.entries(methodLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}>
          <Download className="h-4 w-4 mr-2" />Exportar
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Concepto</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Paciente</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Importe</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Medio</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No se encontraron pagos</td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{format(new Date(p.date), 'dd/MM/yyyy')}</td>
                    <td className="px-4 py-3">{p.concept}</td>
                    <td className="px-4 py-3 text-gray-600">{p.patient ? `${p.patient.last_name}, ${p.patient.first_name}` : '—'}</td>
                    <td className="px-4 py-3 font-semibold">${p.amount.toLocaleString('es-AR')}</td>
                    <td className="px-4 py-3 text-gray-500">{methodLabels[p.payment_method]}</td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs ${statusColors[p.status]}`}>{statusLabels[p.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setConfirmId(p.id)}>
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <p className="text-xs text-gray-400">{filtered.length} de {payments.length} pagos</p>

      <AlertDialog open={!!confirmId} onOpenChange={o => !o && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { handleDeleteConfirmed(confirmId!); setConfirmId(null) }} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
