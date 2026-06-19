import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// This page redirects based on role:
// - professional → /my-agenda (their home)
// - everyone else → /dashboard
export default async function MyDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'professional') {
    redirect('/my-agenda')
  }

  redirect('/dashboard')
}
