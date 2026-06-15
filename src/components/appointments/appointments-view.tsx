'use client'

import { useState } from 'react'
import { Appointment } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search, Edit, Eye, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type AppointmentRow = Appointment & {
  patient?: { first_name: string; last_name: string } | null
  professional?: { first_name: string; last_name: string } | null
  room?: { name: string } | null
}

const statusLabels: Record<string, string> = {
  reserved: 'Reservado', confirmed: 'Confirmado', pending_confirmation: 'Por confirmar',
  completed: 'Realizado', cancelled_with_notice: 'Cancelado (aviso)', cancelled_without_notice: 'Cancelado (sin aviso)',
  absent: 'Ausente', rescheduled: 'Reprogramado',
}
const statusColors: Record<string, string> = {
  reserved: 'bg-blue-100 text-blue-700', confirmed: 'bg-green-100 text-green-700',
  pending_confirmation: 'bg-yellow-100 text-yellow-700', completed: 'bg-gray-100 text-gray-600',
  cancelled_with_notice: 'bg-orange-100 text-orange-600', cancelled_without_notice: 'bg-red-100 text-red-600',
  absent: 'bg-red-100 text-red-700', rescheduled: 'bg-purple-100 text-purple-700',
}

interface Props {
  appointments: AppointmentRow[]
  professionals: { id: string; first_name: string; last_name: string }[]
  patients: { id: string; first_name: string; last_name: string }[]
  rooms: { id: string; name: string }[]
}

export function AppointmentsView({ appointments, professionals }: Props) {
  const [search, setSearch] = useState('')
  const [filterProfessional, setFilterProfessional] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const router = useRouter()

  const filtered = appointments.filter(a => {
    const patientName = `${a.patient?.first_name ?? ''} ${a.patient?.last_name ?? ''}`.toLowerCase()
    const profName = `${a.professional?.first_name ?? ''} ${a.professional?.last_name ?? ''}`.toLowerCase()
    const matchSearch = patientName.includes(search.toLowerCase()) || profName.includes(search.toLowerCase())
    const matchProfessional = filterProfessional === 'all' || a.professional_id === filterProfessional
    const matchStatus = filterStatus === 'all' || a.status === filterStatus
    return matchSearch && matchProfessional && matchStatus
  })

  async function updateStatus(id: string, status: string) {
    const supabase = createClient()
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id)
    if (error) { toast.error('Error al actualizar'); return }
    toast.success('Estado actualizado')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Buscar paciente o profesional..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterProfessional} onValueChange={setFilterProfessional}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Profesional" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los profesionales</SelectItem>
            {professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.last_name}, {p.first_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha y hora</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Paciente</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Profesional</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Consultorio</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Pago</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No se encontraron turnos</td></tr>
                ) : filtered.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{format(new Date(a.start_time), 'dd/MM/yyyy', { locale: es })}</p>
                      <p className="text-xs text-gray-400">{format(new Date(a.start_time), 'HH:mm')} - {format(new Date(a.end_time), 'HH:mm')}</p>
                    </td>
                    <td className="px-4 py-3">{a.patient?.last_name}, {a.patient?.first_name}</td>
                    <td className="px-4 py-3">{a.professional?.last_name}, {a.professional?.first_name}</td>
                    <td className="px-4 py-3 text-gray-500">{a.room?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs ${statusColors[a.status]}`}>{statusLabels[a.status]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs ${a.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {a.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {a.status === 'confirmed' && (
                          <Button variant="ghost" size="sm" title="Marcar realizado" onClick={() => updateStatus(a.id, 'completed')}>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </Button>
                        )}
                        {['reserved', 'confirmed', 'pending_confirmation'].includes(a.status) && (
                          <Button variant="ghost" size="sm" title="Cancelar" onClick={() => updateStatus(a.id, 'cancelled_with_notice')}>
                            <XCircle className="h-4 w-4 text-red-400" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/appointments/${a.id}/edit`}><Edit className="h-4 w-4" /></Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <p className="text-xs text-gray-400">{filtered.length} de {appointments.length} turnos del mes</p>
    </div>
  )
}
