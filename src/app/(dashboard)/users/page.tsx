import { createClient } from '@/lib/supabase/server'
import { UsersTable } from '@/components/users/users-table'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usuarios del sistema</h1>
        <p className="text-gray-500 text-sm">{users?.length ?? 0} usuarios registrados</p>
      </div>
      <UsersTable users={users ?? []} />
    </div>
  )
}
