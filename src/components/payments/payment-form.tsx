'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

const paymentSchema = z.object({
  concept: z.string().min(1, 'Concepto requerido'),
  amount: z.coerce.number().positive('Importe debe ser positivo'),
  payment_method: z.string().min(1, 'Medio de pago requerido'),
  status: z.string().default('paid'),
  date: z.string().min(1, 'Fecha requerida'),
  patient_id: z.string().optional(),
  professional_id: z.string().optional(),
  receipt_number: z.string().optional(),
  cash_destination: z.string().optional(),
  observations: z.string().optional(),
})

type FormData = z.infer<typeof paymentSchema>

interface Props {
  patients: { id: string; first_name: string; last_name: string }[]
  professionals: { id: string; first_name: string; last_name: string }[]
}

export function PaymentForm({ patients, professionals }: Props) {
  const router = useRouter()
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(paymentSchema) as any,
    defaultValues: { status: 'paid', date: new Date().toISOString().split('T')[0] },
  })

  async function onSubmit(data: FormData) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      ...data,
      patient_id: data.patient_id || null,
      professional_id: data.professional_id || null,
      receipt_number: data.receipt_number || null,
      cash_destination: data.cash_destination || null,
      observations: data.observations || null,
      registered_by: user?.id,
    }
    const { error } = await supabase.from('payments').insert(payload)
    if (error) { toast.error('Error al registrar pago'); return }

    // Also create cash movement
    await supabase.from('cash_movements').insert({
      type: 'income', concept: data.concept, amount: data.amount,
      payment_method: data.payment_method as 'cash' | 'transfer' | 'mercadopago' | 'debit' | 'credit' | 'other',
      date: data.date, registered_by: user?.id,
    })

    toast.success('Pago registrado')
    router.push('/payments')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          <div className="space-y-1 sm:col-span-2">
            <Label>Concepto *</Label>
            <Input {...register('concept')} placeholder="Sesión, evaluación, informe..." />
            {errors.concept && <p className="text-xs text-red-500">{errors.concept.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Importe *</Label>
            <Input type="number" step="0.01" {...register('amount')} />
            {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Fecha *</Label>
            <Input type="date" {...register('date')} />
          </div>
          <div className="space-y-1">
            <Label>Medio de pago *</Label>
            <Select value={watch('payment_method') ?? ''} onValueChange={v => setValue('payment_method', v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Efectivo</SelectItem>
                <SelectItem value="transfer">Transferencia</SelectItem>
                <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                <SelectItem value="debit">Débito</SelectItem>
                <SelectItem value="credit">Crédito</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
            {errors.payment_method && <p className="text-xs text-red-500">{errors.payment_method.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Estado</Label>
            <Select value={watch('status')} onValueChange={v => setValue('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="paid">Pagado</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="partial">Parcial</SelectItem>
                <SelectItem value="discounted">Bonificado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Paciente</Label>
            <Select value={watch('patient_id') ?? '__none__'} onValueChange={v => setValue('patient_id', v === '__none__' ? undefined : v)}>
              <SelectTrigger><SelectValue placeholder="Sin asociar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin paciente</SelectItem>
                {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.last_name}, {p.first_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Profesional</Label>
            <Select value={watch('professional_id') ?? '__none__'} onValueChange={v => setValue('professional_id', v === '__none__' ? undefined : v)}>
              <SelectTrigger><SelectValue placeholder="Sin asociar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin profesional</SelectItem>
                {professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.last_name}, {p.first_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Nro. comprobante</Label>
            <Input {...register('receipt_number')} />
          </div>
          <div className="space-y-1">
            <Label>Destino (caja/cuenta)</Label>
            <Input {...register('cash_destination')} placeholder="Caja chica, banco..." />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Observaciones</Label>
            <Textarea {...register('observations')} rows={2} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Registrar pago
        </Button>
      </div>
    </form>
  )
}



