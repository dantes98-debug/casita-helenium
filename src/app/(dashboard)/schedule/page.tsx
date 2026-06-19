import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ScheduleGrid } from '@/components/schedule/schedule-grid'
import { startOfWeek, endOfWeek, addWeeks } from 'date-fns'

export default async function SchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'super_admin' && profile?.role !== 'coordinator') redirect('/my-agenda')

  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString()
  const weekEnd = endOfWeek(addWeeks(now, 3), { weekStartsOn: 1 }).toISOString()

  const [{ data: rooms }, { data: professionals }, { data: blocks }] = await Promise.all([
    supabase.from('rooms').select('id, name').eq('status', 'available').order('name'),
    supabase.from('professionals').select('id, first_name, last_name, room_hourly_rate').eq('status', 'active').is('deleted_at', null).order('last_name'),
    supabase.from('schedule_blocks')
      .select('*, professional:professionals(id, first_name, last_name), room:rooms(id, name)')
      .gte('start_time', weekStart)
      .lte('start_time', weekEnd)
      .order('start_time'),
  ])

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agenda de consultorios</h1>
        <p className="text-sm text-gray-500 mt-1">Asigná bloques horarios a cada profesional por consultorio</p>
      </div>
      <ScheduleGrid
        rooms={rooms ?? []}
        professionals={professionals ?? []}
        blocks={blocks ?? []}
      />
    </div>
  )
}
