'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProfessionalAgreement } from '@/types/database'
import { format } from 'date-fns'
import { Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const typeLabels: Record<string, string> = {
  hourly_rental: 'Alquiler por hora',
  monthly_rental: 'Alquiler mensual',
  session_percentage: 'Porcentaje por sesión',
  fixed_fee: 'Honorario fijo',
  mixed: 'Mixto',
  fixed_blocks: 'Bloques fijos',
  custom: 'Personalizado',
}

export function AgreementCard({ agreement, professionalId }: { agreement: ProfessionalAgreement; professionalId: string }) {
  const router = useRouter()

  async function handleDelete() {
    if (!confirm('¿Eliminar este acuerdo?')) return
    const supabase = createClient()
    const { error } = await supabase.from('professional_agreements').update({ status: 'inactive' }).eq('id', agreement.id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Acuerdo desactivado')
    router.refresh()
  }

  return (
    <Card className={agreement.status === 'active' ? 'border-teal-200' : 'opacity-60'}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{typeLabels[agreement.type]}</span>
              <Badge className={agreement.status === 'active' ? 'bg-green-100 text-green-700 text-xs' : 'bg-gray-100 text-gray-500 text-xs'}>
                {agreement.status === 'active' ? 'Vigente' : 'Inactivo'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
              {agreement.session_value && <span>Valor sesión: <b>${agreement.session_value}</b></span>}
              {agreement.professional_percentage && <span>Prof: <b>{agreement.professional_percentage}%</b></span>}
              {agreement.center_percentage && <span>Centro: <b>{agreement.center_percentage}%</b></span>}
              {agreement.room_hourly_value && <span>Hora consultorio: <b>${agreement.room_hourly_value}</b></span>}
              {agreement.monthly_value && <span>Mensual: <b>${agreement.monthly_value}</b></span>}
              {agreement.fixed_fee && <span>Honorario fijo: <b>${agreement.fixed_fee}</b></span>}
              <span>Desde: <b>{format(new Date(agreement.start_date), 'dd/MM/yyyy')}</b></span>
              {agreement.end_date && <span>Hasta: <b>{format(new Date(agreement.end_date), 'dd/MM/yyyy')}</b></span>}
            </div>
            {agreement.observations && <p className="text-xs text-gray-400">{agreement.observations}</p>}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/professionals/${professionalId}/agreements/${agreement.id}/edit`}>
                <Edit className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5 text-red-400" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
