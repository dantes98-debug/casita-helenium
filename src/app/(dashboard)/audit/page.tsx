import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

const actionColors: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-700', UPDATE: 'bg-blue-100 text-blue-700', DELETE: 'bg-red-100 text-red-700',
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
        <p className="text-gray-500 text-sm">Registro de todas las acciones del sistema</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha/Hora</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Usuario</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Acción</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tabla</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">ID registro</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {!logs || logs.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin registros de auditoría</td></tr>
                ) : logs.map((log: {
                  id: string
                  created_at: string
                  user?: { full_name?: string; email?: string } | null
                  action: string
                  table_name: string
                  record_id?: string | null
                }) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 text-xs">{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}</td>
                    <td className="px-4 py-3">{(log.user as { full_name?: string; email?: string } | null)?.full_name ?? (log.user as { full_name?: string; email?: string } | null)?.email ?? 'Sistema'}</td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs ${actionColors[log.action] ?? 'bg-gray-100 text-gray-600'}`}>{log.action}</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{log.table_name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{log.record_id?.slice(0, 8)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
