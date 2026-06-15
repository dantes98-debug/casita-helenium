import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { ProfessionalOnboarding } from '@/components/onboarding/professional-onboarding'
import { CommandPalette } from '@/components/ui/command-palette'
import { UserRole } from '@/types/database'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, onboarding_completed_at')
    .eq('id', user.id)
    .single()

  const showOnboarding = profile?.role === 'professional' && !profile?.onboarding_completed_at

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar userRole={profile?.role as UserRole} userName={profile?.full_name} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <CommandPalette />
      {showOnboarding && <ProfessionalOnboarding userId={user.id} userName={profile?.full_name} />}
    </div>
  )
}
