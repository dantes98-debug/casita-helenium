import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Edit, ArrowLeft, Phone, Mail, FileText, Calendar, History } from 'lucide-react'
import { format, differenceInYears } from 'date-fns'
import { es } from 'date-fns/locale'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FamilyMembersSection } from '@/components/patients/family-members-section'

const statusLabels: Record<string, string> = {
  active: 'Activo', paused: 'En pausa', discharged: 'Alta',
  inactive: 'Inactivo', waiting_list: 'Lista de espera', referred: 'Derivado',
}
const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700', paused: 'bg-yellow-100 text-yellow-700',
  discharged: 'bg-blue-100 text-blue-700', inactive: 'bg-gray-100 text-gray-500',
  waiting_list: 'bg-orange-100 text-orange-700', referred: 'bg-purple-100 text-purple-700',
}
const actionLabels: Record<string, string> = {
  INSERT: 'Creación', UPDATE: 'Edición', DELETE: 'Eliminación',
}
const actionColors: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-700', UPDATE: 'bg-blue-100 text-blue-700', DELETE: 'bg-red-100 text-red-700',
}

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
  const { data: profile } = user
    ? await adminClient.from('profiles').select('role').eq('id', user.id).single()
    : { data: null }
  const isProfessional = profile?.role === 'professional'

  const [
    { data: patient },
    { data: familyMembers },
    { data: appointments },
    { data: debts },
    { data: clinicalRecord },
    { data: auditLogs },
  ] = await Promise.all([
    supabase.from('patients').select(`*, primary_professional:professionals(first_name, last_name, profession)`).eq('id', id).is('deleted_at', null).single(),
    supabase.from('family_members').select('*').eq('patient_id', id),
    supabase.from('appointments').select(`id, start_time, end_time, status, payment_status, value, professional:professionals(first_name, last_name)`)
      .eq('patient_id', id).order('start_time', { ascending: false }).limit(20),
    supabase.from('debts').select('*').eq('patient_id', id).in('status', ['active', 'partially_paid']),
    supabase.from('clinical_records').select('id, status').eq('patient_id', id).single(),
    supabase.from('audit_logs').select('id, action, table_name, old_values, new_values, created_at')
      .eq('record_id', id).order('created_at', { ascending: false }).limit(50),
  ])

  if (!patient) notFound()
  const age = patient.birth_date ? differenceInYears(new Date(), new Date(patient.birth_date)) : null
  const totalDebt = debts?.reduce((acc, d) => acc + d.amount, 0) ?? 0

  const now = new Date()
  const completedStatuses = ['completed', 'confirmed', 'reserved', 'pending_confirmation']
  const lastSession = appointments?.find(a =>
    new Date(a.start_time) < now && completedStatuses.includes(a.status)
  ) ?? null
  const nextAppointment = appointments?.slice().reverse().find(a =>
    new Date(a.start_time) > now && ['reserved', 'confirmed', 'pending_confirmation'].includes(a.status)
  ) ?? null

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/patients"><ArrowLeft className="h-4 w-4 mr-1" />Volver</Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{patient.last_name}, {patient.first_name}</h1>
          <p className="text-gray-500">{age !== null ? `${age} años` : ''}{patient.diagnosis ? ` · ${patient.diagnosis}` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusColors[patient.status]}>{statusLabels[patient.status]}</Badge>
          <Button asChild size="sm" className="bg-teal-600 hover:bg-teal-700">
            <Link href={`/patients/${id}/edit`}><Edit className="h-4 w-4 mr-1" />Editar</Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="appointments">Turnos</TabsTrigger>
          <TabsTrigger value="clinical">Historia clínica</TabsTrigger>
          <TabsTrigger value="family">Familia</TabsTrigger>
          {!isProfessional && <TabsTrigger value="finances">Finanzas</TabsTrigger>}
          {!isProfessional && <TabsTrigger value="history">Historial</TabsTrigger>}
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Datos personales</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {patient.phone && <div className="flex items-center gap-2 text-gray-600"><Phone className="h-4 w-4" />{patient.phone}</div>}
                {patient.email && <div className="flex items-center gap-2 text-gray-600"><Mail className="h-4 w-4" />{patient.email}</div>}
                {patient.address && <div className="text-gray-600">{patient.address}</div>}
                {patient.dni && <div><span className="text-gray-400">DNI:</span> {patient.dni}</div>}
                {patient.birth_date && <div><span className="text-gray-400">Nacimiento:</span> {format(new Date(patient.birth_date), "dd 'de' MMMM 'de' yyyy", { locale: es })} ({age} años)</div>}
                {patient.health_insurance && <div><span className="text-gray-400">Obra social:</span> {patient.health_insurance} {patient.health_insurance_number ? `(${patient.health_insurance_number})` : ''}</div>}
                {patient.admission_date && <div><span className="text-gray-400">Ingreso:</span> {format(new Date(patient.admission_date), 'dd/MM/yyyy')}</div>}
                {patient.referral_source && <div><span className="text-gray-400">Fuente:</span> {patient.referral_source}</div>}
                {(patient as any).school && <div><span className="text-gray-400">Escuela:</span> {(patient as any).school}</div>}
                {(patient as any).school_grade && <div><span className="text-gray-400">Año/Grado:</span> {(patient as any).school_grade}</div>}
                {(patient as any).school_shift && (
                  <div><span className="text-gray-400">Turno:</span> {
                    ({ morning: 'Mañana', afternoon: 'Tarde', full_day: 'Jornada completa' } as any)[(patient as any).school_shift] ?? (patient as any).school_shift
                  }</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Datos clínicos</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {patient.primary_professional && (
                  <div><span className="text-gray-400">Profesional principal:</span><br />
                    {(patient.primary_professional as any).last_name}, {(patient.primary_professional as any).first_name} — {(patient.primary_professional as any).profession}
                  </div>
                )}
                {patient.reason_for_consultation && (
                  <div><span className="text-gray-400">Motivo de consulta:</span><br />{patient.reason_for_consultation}</div>
                )}
                {patient.diagnosis && (
                  <div><span className="text-gray-400">Diagnóstico:</span> {patient.diagnosis}</div>
                )}
                {patient.observations && (
                  <div><span className="text-gray-400">Observaciones:</span><br />{patient.observations}</div>
                )}
                {lastSession && (
                  <div><span className="text-gray-400">Última sesión:</span> {format(new Date(lastSession.start_time), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}</div>
                )}
                {nextAppointment && (
                  <div><span className="text-gray-400">Próximo turno:</span> {format(new Date(nextAppointment.start_time), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="appointments" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Historial de turnos</CardTitle>
              <Button asChild size="sm" className="bg-teal-600 hover:bg-teal-700">
                <Link href={`/appointments/new?patient_id=${id}`}><Calendar className="h-4 w-4 mr-1" />Nuevo turno</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {appointments?.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Sin turnos registrados</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2">Fecha</th>
                      <th className="text-left px-3 py-2">Profesional</th>
                      <th className="text-left px-3 py-2">Estado</th>
                      <th className="text-left px-3 py-2">Pago</th>
                      <th className="text-left px-3 py-2">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {appointments?.map((a: any) => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">{format(new Date(a.start_time), 'dd/MM/yyyy HH:mm')}</td>
                        <td className="px-3 py-2">{a.professional?.last_name}, {a.professional?.first_name}</td>
                        <td className="px-3 py-2"><Badge className="text-xs">{a.status}</Badge></td>
                        <td className="px-3 py-2"><Badge className={`text-xs ${a.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{a.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}</Badge></td>
                        <td className="px-3 py-2">{a.value ? `$${a.value}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clinical" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Historia clínica</CardTitle>
              {clinicalRecord && (
                <Button asChild size="sm" className="bg-teal-600 hover:bg-teal-700">
                  <Link href={`/patients/${id}/clinical-record`}><FileText className="h-4 w-4 mr-1" />Ver historia clínica</Link>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!clinicalRecord ? (
                <p className="text-sm text-gray-400">Sin historia clínica</p>
              ) : (
                <p className="text-sm">Historia clínica activa. <Link href={`/patients/${id}/clinical-record`} className="text-teal-600 underline">Acceder →</Link></p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="family" className="mt-4">
          <FamilyMembersSection patientId={id} initialMembers={familyMembers ?? []} />
        </TabsContent>

        <TabsContent value="finances" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <Card className="bg-red-50 border-red-100">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 uppercase">Deuda total activa</p>
                <p className="text-2xl font-bold text-red-700">${totalDebt.toLocaleString('es-AR')}</p>
              </CardContent>
            </Card>
          </div>
          {debts && debts.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Deudas activas</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2">Concepto</th>
                      <th className="text-left px-3 py-2">Monto</th>
                      <th className="text-left px-3 py-2">Vencimiento</th>
                      <th className="text-left px-3 py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {debts.map(d => (
                      <tr key={d.id}>
                        <td className="px-3 py-2">{d.concept}</td>
                        <td className="px-3 py-2 font-medium">${d.amount}</td>
                        <td className="px-3 py-2">{d.due_date ? format(new Date(d.due_date), 'dd/MM/yyyy') : '—'}</td>
                        <td className="px-3 py-2"><Badge className="text-xs bg-red-100 text-red-700">{d.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                Historial de cambios
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!auditLogs || auditLogs.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Sin registros de cambios</p>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => {
                    const changes: string[] = []
                    if (log.action === 'UPDATE' && log.old_values && log.new_values) {
                      const oldV = log.old_values as Record<string, unknown>
                      const newV = log.new_values as Record<string, unknown>
                      const fieldLabels: Record<string, string> = {
                        first_name: 'Nombre', last_name: 'Apellido', status: 'Estado',
                        phone: 'Teléfono', email: 'Email', diagnosis: 'Diagnóstico',
                        observations: 'Observaciones', primary_professional_id: 'Profesional',
                        health_insurance: 'Obra social', address: 'Dirección',
                      }
                      for (const key of Object.keys(newV)) {
                        if (key in oldV && oldV[key] !== newV[key] && key !== 'updated_at') {
                          const label = fieldLabels[key] ?? key
                          changes.push(`${label}: "${String(oldV[key] ?? '—')}" → "${String(newV[key] ?? '—')}"`)
                        }
                      }
                    }
                    return (
                      <div key={log.id} className="flex gap-3 text-sm border-b pb-3 last:border-0">
                        <div className="mt-0.5">
                          <Badge className={`text-xs ${actionColors[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                            {actionLabels[log.action] ?? log.action}
                          </Badge>
                        </div>
                        <div className="flex-1 text-gray-600">
                          {changes.length > 0 ? (
                            <ul className="space-y-0.5">
                              {changes.map((c, i) => <li key={i}>{c}</li>)}
                            </ul>
                          ) : (
                            <span>{log.action === 'INSERT' ? 'Paciente creado' : 'Cambio registrado'}</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 whitespace-nowrap">
                          {format(new Date(log.created_at), 'dd/MM/yy HH:mm')}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
