import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { ProfessionalOnboarding } from '@/components/onboarding/professional-onboarding'
import { CommandPalette } from '@/components/ui/command-palette'
import { UserRole } from '@/types/database'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Use service role to bypass any RLS/session propagation issues when fetching the profile.
  // getUser() already verified the user's identity; we just need their role and name.
  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
  const { data: profile } = await adminClient
    .from('profiles')
    .select('full_name, role, onboarding_completed_at')
    .eq('id', user.id)
    .single()

  // Check if this user also has a professional record (admin who is also a psychologist)
  const { data: professionalRecord } = await adminClient
    .from('professionals')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  const hasProfessionalRecord = !!professionalRecord
  const showOnboarding = profile?.role === 'professional' && !profile?.onboarding_completed_at

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar userRole={profile?.role as UserRole} userName={profile?.full_name} hasProfessionalRecord={hasProfessionalRecord} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <CommandPalette />
      {showOnboarding && <ProfessionalOnboarding userId={user.id} userName={profile?.full_name} />}
    </div>
  )
}
