import { createClient } from '@/lib/supabase/server'
import { PaymentForm } from '@/components/payments/payment-form'

export default async function NewPaymentPage() {
  const supabase = await createClient()
  const [{ data: patients }, { data: professionals }] = await Promise.all([
    supabase.from('patients').select('id, first_name, last_name').is('deleted_at', null).order('last_name'),
    supabase.from('professionals').select('id, first_name, last_name').eq('status', 'active').is('deleted_at', null).order('last_name'),
  ])
  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Registrar pago</h1>
      </div>
      <PaymentForm patients={patients ?? []} professionals={professionals ?? []} />
    </div>
  )
}
