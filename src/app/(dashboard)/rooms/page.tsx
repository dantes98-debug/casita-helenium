import { createClient } from '@/lib/supabase/server'
import { RoomsView } from '@/components/rooms/rooms-view'
import { RoomAgendaHourly } from '@/components/rooms/room-agenda-hourly'
import { RoomBilling } from '@/components/rooms/room-billing'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Building2, Calendar, DollarSign } from 'lucide-react'

export default async function RoomsPage() {
  const supabase = await createClient()

  const [
    { data: rooms },
    { data: professionals },
    { data: bookings },
  ] = await Promise.all([
    supabase.from('rooms').select('*').order('name'),
    supabase.from('professionals')
      .select('id, first_name, last_name, profession, room_hourly_rate')
      .eq('status', 'active').is('deleted_at', null).order('last_name'),
    supabase.from('room_bookings')
      .select(`
        id, room_id, professional_id, start_time, end_time, hours_used,
        status, notes, billed, created_at,
        room:rooms(name),
        professional:professionals(first_name, last_name, room_hourly_rate)
      `)
      .order('start_time', { ascending: false })
      .limit(200),
  ])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Consultorios</h1>
        <p className="text-gray-500 text-sm">Gestión de espacios y reservas</p>
      </div>

      <Tabs defaultValue="agenda">
        <TabsList>
          <TabsTrigger value="agenda" className="gap-2"><Calendar className="h-4 w-4" />Agenda</TabsTrigger>
          <TabsTrigger value="billing" className="gap-2"><DollarSign className="h-4 w-4" />Facturación</TabsTrigger>
          <TabsTrigger value="rooms" className="gap-2"><Building2 className="h-4 w-4" />Espacios</TabsTrigger>
        </TabsList>

        <TabsContent value="agenda" className="mt-4">
          <RoomAgendaHourly
            rooms={rooms ?? []}
            professionals={professionals ?? []}
            bookings={(bookings as any) ?? []}
          />
        </TabsContent>

        <TabsContent value="billing" className="mt-4">
          <RoomBilling
            bookings={(bookings as any) ?? []}
            professionals={professionals ?? []}
          />
        </TabsContent>

        <TabsContent value="rooms" className="mt-4">
          <RoomsView rooms={rooms ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
