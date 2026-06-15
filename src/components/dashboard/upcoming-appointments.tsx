import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { Clock } from 'lucide-react'

interface Appointment {
  id: string
  start_time: string
  status: string
  patient?: { first_name: string; last_name: string } | null
  professional?: { first_name: string; last_name: string } | null
}

const statusColors: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  reserved: 'bg-blue-100 text-blue-700',
  pending_confirmation: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-gray-100 text-gray-600',
}
const statusLabels: Record<string, string> = {
  confirmed: 'Confirmado', reserved: 'Reservado',
  pending_confirmation: 'Por confirmar', completed: 'Realizado',
}

export function UpcomingAppointments({ appointments }: { appointments: Appointment[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-teal-600" />
          Turnos de hoy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {appointments.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No hay turnos restantes hoy</p>
        ) : appointments.map(apt => (
          <div key={apt.id} className="flex items-start justify-between gap-2 py-1.5 border-b last:border-0">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {apt.patient?.first_name} {apt.patient?.last_name}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {format(new Date(apt.start_time), 'HH:mm')} · {apt.professional?.first_name} {apt.professional?.last_name}
              </p>
            </div>
            <Badge className={`text-xs shrink-0 ${statusColors[apt.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {statusLabels[apt.status] ?? apt.status}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
