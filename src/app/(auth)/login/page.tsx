'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Heart, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetMode, setResetMode] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      let data: Record<string, string> = {}
      try { data = await res.json() } catch { /* empty body */ }
      if (!res.ok) throw new Error(data.error ?? 'Error al iniciar sesión')
      await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token })
      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
      })
      if (error) throw error
      toast.success('Email de recuperación enviado. Revisá tu bandeja.')
      setResetMode(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al enviar email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-100 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Heart className="h-8 w-8 text-teal-600 fill-teal-200" />
            <h1 className="text-2xl font-bold text-teal-900">La Casita Helenium</h1>
          </div>
          <p className="text-sm text-teal-700">Centro de Atención Psicológica e Interdisciplinaria</p>
        </div>

        <Card className="shadow-lg border-teal-100">
          <CardHeader>
            <CardTitle>{resetMode ? 'Recuperar contraseña' : 'Iniciar sesión'}</CardTitle>
            <CardDescription>
              {resetMode
                ? 'Ingresá tu email para recibir un enlace de recuperación'
                : 'Ingresá con tus credenciales para acceder al sistema'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={resetMode ? handleReset : handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nombre@lacasita.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {!resetMode && (
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              )}
              <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {resetMode ? 'Enviar email de recuperación' : 'Ingresar'}
              </Button>
              <button
                type="button"
                onClick={() => setResetMode(!resetMode)}
                className="w-full text-sm text-teal-600 hover:underline text-center"
              >
                {resetMode ? '← Volver al login' : '¿Olvidaste tu contraseña?'}
              </button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-500">
          Sistema de gestión interno — acceso solo para personal autorizado
        </p>
      </div>
    </div>
  )
}
