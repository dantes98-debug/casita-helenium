import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { Edit, ArrowLeft, Phone, Mail, MapPin, DollarSign, User, BarChart3, CalendarOff } from 'lucide-react'
import { AgreementCard } from '@/components/professionals/agreement-card'
import { ProfessionalLiquidation } from '@/components/professionals/professional-liquidation'
import { ProfessionalReports } from '@/components/professionals/professional-reports'
import { LinkUserSection } from '@/components/professionals/link-user-section'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

const typeLabels: Record<string, string> = {
  internal: 'Interno', external: 'Externo', mixed: 'Mixto',
  workshop: 'Tallerista', room_rental: 'Alquiler consultorio',
}

export default async function ProfessionalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const now = new Date()
  const monthStart = startOfMonth(now).toISOString().split('T')[0]
  const monthEnd = endOfMonth(now).toISOString().split('T')[0]

  const [{ data: professional }, { data: agreements }, { data: patients }, { data: appointments }, { data: roomBookings }, { data: allAppointments }, { data: professionalProfiles }] = await Promise.all([
    supabase.from('professionals').select('*').eq('id', id).is('deleted_at', null).single(),
    supabase.from('professional_agreements').select('*').eq('professional_id', id).order('start_date', { ascending: false }),
    supabase.from('patients').select('id, first_name, last_name, status, patient_source').eq('primary_professional_id', id).is('deleted_at', null),
    supabase.from('appointments').select('id, start_time, status, patient:patients(first_name, last_name)')
      .eq('professional_id', id).gte('start_time', now.toISOString()).order('start_time').limit(5),
    supabase.from('room_bookings').select('id, hours_used, billed, start_time')
      .eq('professional_id', id).eq('status', 'confirmed').order('start_time', { ascending: false }).limit(200),
    // All appointments (last 6 months) for reports
    supabase.from('appointments').select('id, start_time, status, patient_id')
      .eq('professional_id', id).gte('start_time', new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString()),
    // Profiles with role=professional for linking
    supabase.from('profiles').select('id, email, full_name').eq('role', 'professional').order('full_name'),
  ])

  const patientIds = (patients ?? []).map(p => p.id)
  const { data: payments } = patientIds.length > 0
    ? await supabase.from('payments').select('id, amount, date, patient_id, status').in('patient_id', patientIds)
    : { data: [] }

  const roomHoursMonth = (roomBookings ?? [])
    .filter(b => b.start_time >= monthStart && b.start_time <= monthEnd + 'T23:59:59')
    .reduce((a, b) => a + Number(b.hours_used || 0), 0)

  if (!professional) notFound()

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/professionals"><ArrowLeft className="h-4 w-4 mr-1" />Volver</Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{professional.last_name}, {professional.first_name}</h1>
          <p className="text-gray-500">{professional.profession}{professional.specialty ? ` · ${professional.specialty}` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={professional.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
            {professional.status === 'active' ? 'Activo' : 'Inactivo'}
          </Badge>
          <Badge variant="outline">{typeLabels[professional.type]}</Badge>
          <Button asChild size="sm" variant="outline">
            <Link href={`/professionals/${id}/absences`}><CalendarOff className="h-4 w-4 mr-1" />Ausencias</Link>
          </Button>
          <Button asChild size="sm" className="bg-teal-600 hover:bg-teal-700">
            <Link href={`/professionals/${id}/edit`}><Edit className="h-4 w-4 mr-1" />Editar</Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info" className="gap-2"><User className="h-4 w-4" />Información</TabsTrigger>
          <TabsTrigger value="reports" className="gap-2"><BarChart3 className="h-4 w-4" />Reportes</TabsTrigger>
          <TabsTrigger value="liquidation" className="gap-2"><DollarSign className="h-4 w-4" />Liquidación</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Información de contacto</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  {professional.phone && <div className="flex items-center gap-2 text-gray-600"><Phone className="h-4 w-4" /><span>{professional.phone}</span></div>}
                  {professional.email && <div className="flex items-center gap-2 text-gray-600"><Mail className="h-4 w-4" /><span>{professional.email}</span></div>}
                  {professional.address && <div className="flex items-center gap-2 text-gray-600 col-span-2"><MapPin className="h-4 w-4" /><span>{professional.address}</span></div>}
                  {professional.dni && <div><span className="text-gray-400">DNI:</span> {professional.dni}</div>}
                  {professional.cuit && <div><span className="text-gray-400">CUIT:</span> {professional.cuit}</div>}
                  {professional.license_number && <div><span className="text-gray-400">Matrícula:</span> {professional.license_number}</div>}
                  {professional.area && <div><span className="text-gray-400">Área:</span> {professional.area}</div>}
                  {professional.join_date && <div><span className="text-gray-400">Ingreso:</span> {format(new Date(professional.join_date), 'dd/MM/yyyy')}</div>}
                </CardContent>
              </Card>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">Acuerdos económicos</h2>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/professionals/${id}/agreements/new`}>Nuevo acuerdo</Link>
                  </Button>
                </div>
                {agreements?.length === 0
                  ? <Card><CardContent className="p-4 text-center text-gray-400 text-sm">Sin acuerdos registrados</CardContent></Card>
                  : agreements?.map(a => <AgreementCard key={a.id} agreement={a} professionalId={id} />)}
              </div>

              {(professional.availability_notes || professional.observations) && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Observaciones</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {professional.availability_notes && <div><p className="font-medium text-gray-500 text-xs uppercase">Disponibilidad</p><p>{professional.availability_notes}</p></div>}
                    {professional.observations && <div><p className="font-medium text-gray-500 text-xs uppercase">Notas</p><p>{professional.observations}</p></div>}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Pacientes asignados</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {patients?.length === 0
                    ? <p className="text-sm text-gray-400">Sin pacientes asignados</p>
                    : patients?.map(p => (
                      <Link key={p.id} href={`/patients/${p.id}`} className="flex items-center justify-between py-1 hover:underline">
                        <span className="text-sm">{p.last_name}, {p.first_name}</span>
                        <div className="flex gap-1">
                          <Badge className={(p as any).patient_source === 'center' ? 'bg-blue-50 text-blue-600 text-xs' : 'bg-violet-50 text-violet-600 text-xs'}>
                            {(p as any).patient_source === 'center' ? 'Centro' : 'Propio'}
                          </Badge>
                          <Badge className={p.status === 'active' ? 'bg-green-50 text-green-700 text-xs' : 'bg-gray-50 text-gray-500 text-xs'}>
                            {p.status === 'active' ? 'Activo' : p.status}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                </CardContent>
              </Card>

              <LinkUserSection
                professionalId={id}
                linkedUserId={(professional as any).user_id ?? null}
                linkedEmail={professionalProfiles?.find(p => p.id === (professional as any).user_id)?.email ?? null}
                availableProfiles={professionalProfiles ?? []}
              />

              <Card>
                <CardHeader><CardTitle className="text-base">Próximos turnos</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {appointments?.length === 0
                    ? <p className="text-sm text-gray-400">Sin turnos próximos</p>
                    : (appointments as any[])?.map((a) => (
                      <div key={a.id} className="py-1 border-b last:border-0">
                        <p className="text-sm font-medium">{a.patient?.first_name} {a.patient?.last_name}</p>
                        <p className="text-xs text-gray-400">{format(new Date(a.start_time), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}</p>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <ProfessionalReports
            professional={{
              id: professional.id,
              first_name: professional.first_name,
              last_name: professional.last_name,
              commission_rate: professional.commission_rate,
              room_hourly_rate: professional.room_hourly_rate,
            }}
            appointments={(allAppointments as any) ?? []}
            payments={(payments as any) ?? []}
            patients={(patients ?? []) as any}
            roomHoursMonth={roomHoursMonth}
          />
        </TabsContent>

        <TabsContent value="liquidation" className="mt-4">
          <ProfessionalLiquidation
            professional={{
              id: professional.id,
              first_name: professional.first_name,
              last_name: professional.last_name,
              profession: professional.profession,
              commission_rate: professional.commission_rate,
              room_hourly_rate: professional.room_hourly_rate,
            }}
            patients={(patients ?? []) as any}
            payments={(payments ?? []) as any}
            roomBookings={(roomBookings ?? []) as any}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
