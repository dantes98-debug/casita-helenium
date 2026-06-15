'use client'

import { useState } from 'react'
import { CashMovement } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Loader2, TrendingUp, TrendingDown, DollarSign, Download } from 'lucide-react'
import * as XLSX from 'xlsx'

const movementSchema = z.object({
  type: z.enum(['income', 'expense']),
  concept: z.string().min(1, 'Concepto requerido'),
  amount: z.coerce.number().positive(),
  payment_method: z.string().min(1),
  date: z.string().min(1),
  category: z.string().optional(),
  observations: z.string().optional(),
})
type FormData = z.infer<typeof movementSchema>

interface Props {
  movements: CashMovement[]
  totalIncome: number
  totalExpenses: number
}

const methodLabels: Record<string, string> = {
  cash: 'Efectivo', transfer: 'Transferencia', mercadopago: 'Mercado Pago',
  debit: 'Débito', credit: 'Crédito', other: 'Otro',
}

function exportToCSV(movements: CashMovement[]) {
  const rows = [
    ['Fecha', 'Tipo', 'Concepto', 'Categoría', 'Medio de pago', 'Monto'],
    ...movements.map(m => [
      format(new Date(m.date), 'dd/MM/yyyy'),
      m.type === 'income' ? 'Ingreso' : 'Egreso',
      m.concept,
      m.category ?? '',
      methodLabels[m.payment_method] ?? m.payment_method,
      (m.type === 'income' ? m.amount : -m.amount).toString(),
    ]),
  ]
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `caja_${format(new Date(), 'yyyy-MM')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function exportToXLSX(movements: CashMovement[]) {
  const data = movements.map(m => ({
    Fecha: format(new Date(m.date), 'dd/MM/yyyy'),
    Tipo: m.type === 'income' ? 'Ingreso' : 'Egreso',
    Concepto: m.concept,
    Monto: m.type === 'income' ? m.amount : -m.amount,
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Caja')
  XLSX.writeFile(wb, `caja_${format(new Date(), 'yyyy-MM')}.xlsx`)
}

const expenseCategories = [
  'Alquiler', 'Servicios (luz/gas/agua)', 'Internet/Teléfono', 'Limpieza',
  'Insumos', 'Honorarios externos', 'Mantenimiento', 'Publicidad',
  'Capacitación', 'Impuestos/Tasas', 'Sueldos', 'Otro',
]

export function CashView({ movements: initial, totalIncome, totalExpenses }: Props) {
  const [movements, setMovements] = useState(initial)
  const [open, setOpen] = useState(false)
  const [defaultType, setDefaultType] = useState<'income' | 'expense'>('income')

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(movementSchema) as any,
    defaultValues: { type: 'income', payment_method: 'cash', date: new Date().toISOString().split('T')[0] },
  })

  function openDialog(type: 'income' | 'expense') {
    reset({ type, payment_method: 'cash', date: new Date().toISOString().split('T')[0] })
    setDefaultType(type)
    setOpen(true)
  }

  async function onSubmit(data: FormData) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: created, error } = await supabase.from('cash_movements')
      .insert({ ...data, registered_by: user?.id, category: data.category || null, observations: data.observations || null })
      .select().single()
    if (error) { toast.error('Error al registrar movimiento'); return }
    setMovements(prev => [created, ...prev])
    toast.success('Movimiento registrado')
    reset({ type: 'income', payment_method: 'cash', date: new Date().toISOString().split('T')[0] })
    setOpen(false)
  }

  const balance = totalIncome - totalExpenses

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-100">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-xs text-gray-500 uppercase">Ingresos del mes</p>
              <p className="text-2xl font-bold text-green-700">${totalIncome.toLocaleString('es-AR')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-100">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingDown className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-xs text-gray-500 uppercase">Egresos del mes</p>
              <p className="text-2xl font-bold text-red-700">${totalExpenses.toLocaleString('es-AR')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={balance >= 0 ? 'bg-teal-50 border-teal-100' : 'bg-orange-50 border-orange-100'}>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className={`h-8 w-8 ${balance >= 0 ? 'text-teal-600' : 'text-orange-600'}`} />
            <div>
              <p className="text-xs text-gray-500 uppercase">Balance</p>
              <p className={`text-2xl font-bold ${balance >= 0 ? 'text-teal-700' : 'text-orange-700'}`}>${balance.toLocaleString('es-AR')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => exportToCSV(movements)} disabled={movements.length === 0}>
          <Download className="h-4 w-4 mr-2" />Exportar CSV
        </Button>
        <Button variant="outline" onClick={() => exportToXLSX(movements)} disabled={movements.length === 0}>
          <Download className="h-4 w-4 mr-2" />Exportar mes
        </Button>
        <Button variant="outline" onClick={() => openDialog('expense')} className="border-red-200 text-red-600 hover:bg-red-50">
          <Plus className="h-4 w-4 mr-2" />Registrar gasto
        </Button>
        <Button onClick={() => openDialog('income')} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="h-4 w-4 mr-2" />Registrar ingreso
        </Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Todos ({movements.length})</TabsTrigger>
          <TabsTrigger value="income" className="data-[state=active]:text-green-700">
            Ingresos ({movements.filter(m => m.type === 'income').length})
          </TabsTrigger>
          <TabsTrigger value="expense" className="data-[state=active]:text-red-700">
            Gastos ({movements.filter(m => m.type === 'expense').length})
          </TabsTrigger>
        </TabsList>

        {(['all', 'income', 'expense'] as const).map(tab => {
          const rows = tab === 'all' ? movements : movements.filter(m => m.type === tab)
          return (
            <TabsContent key={tab} value={tab} className="mt-3">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Concepto</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Categoría</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Medio</th>
                          {tab === 'all' && <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>}
                          <th className="text-right px-4 py-3 font-medium text-gray-600">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {rows.length === 0 ? (
                          <tr><td colSpan={tab === 'all' ? 6 : 5} className="px-4 py-8 text-center text-gray-400">
                            {tab === 'expense' ? 'Sin gastos registrados este mes' : tab === 'income' ? 'Sin ingresos registrados este mes' : 'Sin movimientos este mes'}
                          </td></tr>
                        ) : rows.map(m => (
                          <tr key={m.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">{format(new Date(m.date), 'dd/MM/yyyy')}</td>
                            <td className="px-4 py-3">{m.concept}</td>
                            <td className="px-4 py-3 text-gray-500">{m.category ?? '—'}</td>
                            <td className="px-4 py-3 text-gray-500">{methodLabels[m.payment_method] ?? m.payment_method}</td>
                            {tab === 'all' && (
                              <td className="px-4 py-3">
                                <Badge className={m.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                  {m.type === 'income' ? 'Ingreso' : 'Gasto'}
                                </Badge>
                              </td>
                            )}
                            <td className={`px-4 py-3 text-right font-semibold ${m.type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                              {m.type === 'income' ? '+' : '-'}${m.amount.toLocaleString('es-AR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {rows.length > 0 && tab !== 'all' && (
                        <tfoot className="bg-gray-50 border-t">
                          <tr>
                            <td colSpan={4} className="px-4 py-2 text-sm font-medium text-gray-600">Total</td>
                            <td className={`px-4 py-2 text-right font-bold ${tab === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                              {tab === 'income' ? '+' : '-'}${rows.reduce((acc, m) => acc + m.amount, 0).toLocaleString('es-AR')}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )
        })}
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className={watch('type') === 'expense' ? 'text-red-700' : 'text-teal-700'}>
              {watch('type') === 'expense' ? 'Registrar gasto' : 'Registrar ingreso'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={watch('type')} onValueChange={v => setValue('type', v as 'income' | 'expense')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Ingreso</SelectItem>
                    <SelectItem value="expense">Gasto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Fecha</Label>
                <Input type="date" {...register('date')} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Concepto *</Label>
                <Input {...register('concept')} placeholder={watch('type') === 'expense' ? 'Ej: Pago alquiler consultorio' : 'Ej: Sesión - García, Juan'} />
                {errors.concept && <p className="text-xs text-red-500">{errors.concept.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Monto *</Label>
                <Input type="number" step="0.01" {...register('amount')} />
              </div>
              <div className="space-y-1">
                <Label>Medio de pago</Label>
                <Select value={watch('payment_method')} onValueChange={v => setValue('payment_method', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                    <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                    <SelectItem value="debit">Débito</SelectItem>
                    <SelectItem value="credit">Crédito</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Categoría</Label>
                {watch('type') === 'expense' ? (
                  <Select value={watch('category') ?? '__none__'} onValueChange={v => setValue('category', v === '__none__' ? undefined : v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar categoría..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin categoría</SelectItem>
                      {expenseCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input {...register('category')} placeholder="Consulta, liquidación, etc." />
                )}
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Observaciones</Label>
                <Textarea {...register('observations')} rows={2} />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button
                type="submit"
                className={watch('type') === 'expense' ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-600 hover:bg-teal-700'}
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar {watch('type') === 'expense' ? 'gasto' : 'ingreso'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
