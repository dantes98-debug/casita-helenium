import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Activity } from 'lucide-react'

interface Log {
  id: string
  action: string
  table_name: string
  created_at: string
  user?: { full_name: string } | null
}

const tableLabels: Record<string, string> = {
  patients: 'Paciente', appointments: 'Turno', payments: 'Pago',
  professionals: 'Profesional', settlements: 'Liquidación', clinical_notes: 'Evolución',
}
const actionLabels: Record<string, string> = {
  INSERT: 'creó', UPDATE: 'modificó', DELETE: 'eliminó',
}

export function RecentActivity({ logs }: { logs: Log[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-teal-600" />
          Actividad reciente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Sin actividad reciente</p>
        ) : logs.map(log => (
          <div key={log.id} className="py-1.5 border-b last:border-0">
            <p className="text-sm text-gray-700">
              <span className="font-medium">{log.user?.full_name ?? 'Sistema'}</span>{' '}
              {actionLabels[log.action] ?? log.action}{' '}
              {tableLabels[log.table_name] ?? log.table_name}
            </p>
            <p className="text-xs text-gray-400">
              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
