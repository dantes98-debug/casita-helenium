import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const actionColors: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
}

const tableLabels: Record<string, { singular: string; feminine?: boolean }> = {
  patients: { singular: 'paciente', feminine: true },
  appointments: { singular: 'turno' },
  clinical_records: { singular: 'historia clínica', feminine: true },
  clinical_notes: { singular: 'nota clínica', feminine: true },
  payments: { singular: 'pago' },
  debts: { singular: 'deuda', feminine: true },
  professionals: { singular: 'profesional' },
  admissions: { singular: 'admisión', feminine: true },
  room_bookings: { singular: 'reserva de consultorio', feminine: true },
  schedule_blocks: { singular: 'bloque de consultorio' },
  settlements: { singular: 'liquidación', feminine: true },
  professional_agreements: { singular: 'acuerdo económico' },
  profiles: { singular: 'perfil de usuario' },
  rooms: { singular: 'consultorio' },
  cash_movements: { singular: 'movimiento de caja' },
  documents: { singular: 'documento' },
  family_members: { singular: 'familiar' },
}

function humanLabel(action: string, tableName: string): string {
  const info = tableLabels[tableName]
  const entity = info?.singular ?? tableName
  const fem = info?.feminine ?? false

  if (action === 'INSERT') return `Registró ${fem ? 'una nueva' : 'un nuevo'} ${entity}`
  if (action === 'UPDATE') return `Modificó ${fem ? 'una' : 'un'} ${entity}`
  if (action === 'DELETE') return `Eliminó ${fem ? 'una' : 'un'} ${entity}`
  return `${action} en ${entity}`
}

export default async function AuditPage() {
  const supabase = await createClient()
  const { data: logs } = await supabase
    .from('audit_logs')
    .select(`*, user:profiles(full_name, email)`)
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Auditoría</h1>
        <p className="text-gray-500 text-sm">Historial de acciones del sistema</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha y hora</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Usuario</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Acción</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Tabla</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {!logs || logs.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Sin registros de auditoría</td></tr>
                ) : logs.map((log: {
                  id: string
                  created_at: string
                  user?: { full_name?: string; email?: string } | null
                  action: string
                  table_name: string
                  record_id?: string | null
                }) => {
                  const userName = (log.user as any)?.full_name ?? (log.user as any)?.email ?? 'Sistema'
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {format(new Date(log.created_at), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{userName}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`text-xs shrink-0 ${actionColors[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                            {log.action === 'INSERT' ? 'Creación' : log.action === 'UPDATE' ? 'Edición' : log.action === 'DELETE' ? 'Eliminación' : log.action}
                          </Badge>
                          <span className="text-gray-600">{humanLabel(log.action, log.table_name)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs hidden sm:table-cell font-mono">{log.table_name}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
