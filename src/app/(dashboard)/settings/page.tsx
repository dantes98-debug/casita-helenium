import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SettingsForm } from '@/components/settings/settings-form'
import { PasswordChangeForm } from '@/components/settings/password-change-form'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
  const { data: centerSettings } = await supabase.from('center_settings').select('*').limit(1).maybeSingle()

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 text-sm">Ajustes del sistema y tu cuenta</p>
      </div>

      {(profile?.role === 'super_admin' || profile?.role === 'admin') && (
        <SettingsForm initialSettings={centerSettings} />
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Tu perfil</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div><span className="text-gray-400">Nombre:</span> <span className="font-medium">{profile?.full_name}</span></div>
            <div><span className="text-gray-400">Email:</span> <span className="font-medium">{profile?.email}</span></div>
            <div><span className="text-gray-400">Rol:</span> <Badge className="text-xs">{profile?.role?.replace('_', ' ')}</Badge></div>
            <div><span className="text-gray-400">Estado:</span> <Badge className={profile?.is_active ? 'bg-green-100 text-green-700 text-xs' : 'bg-gray-100 text-gray-500 text-xs'}>{profile?.is_active ? 'Activo' : 'Inactivo'}</Badge></div>
          </div>
        </CardContent>
      </Card>

      <PasswordChangeForm />

      <Card>
        <CardHeader><CardTitle className="text-base">Información del sistema</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>🏥 <b>La Casita Helenium</b> — Sistema de Gestión Integral v1.0</p>
          <p>📊 Base de datos: Supabase PostgreSQL con RLS activo</p>
          <p>🔒 Autenticación: Supabase Auth</p>
          <p>🚀 Plataforma: Next.js 14 + Vercel</p>
        </CardContent>
      </Card>
    </div>
  )
}
