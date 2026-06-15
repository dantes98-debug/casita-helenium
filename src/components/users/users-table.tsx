'use client'

import { useState } from 'react'
import { Profile } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Plus, Loader2 } from 'lucide-react'

const roleColors: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-700', admin: 'bg-orange-100 text-orange-700',
  professional: 'bg-teal-100 text-teal-700', coordinator: 'bg-blue-100 text-blue-700',
  family: 'bg-gray-100 text-gray-600',
}
const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin', admin: 'Administración', professional: 'Profesional',
  coordinator: 'Coordinador', family: 'Familia',
}

export function UsersTable({ users }: { users: Profile[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'professional', profession: '' })

  async function toggleActive(id: string, current: boolean) {
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({ is_active: !current }).eq('id', id)
    if (error) { toast.error('Error al actualizar'); return }
    toast.success(`Usuario ${!current ? 'activado' : 'desactivado'}`)
    router.refresh()
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email || !form.password || !form.role) { toast.error('Completá todos los campos'); return }
    setLoading(true)
    const res = await fetch('/api/users/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { toast.error(json.error || 'Error al crear usuario'); return }
    toast.success('Usuario creado')
    setOpen(false)
    setForm({ email: '', password: '', full_name: '', role: 'professional', profession: '' })
    router.refresh()
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="h-4 w-4 mr-2" />Nuevo usuario
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Rol</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Creado</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin usuarios</td></tr>
                ) : users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{u.full_name}</td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs ${roleColors[u.role]}`}>{roleLabels[u.role]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={u.is_active ? 'bg-green-100 text-green-700 text-xs' : 'bg-gray-100 text-gray-500 text-xs'}>
                        {u.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{format(new Date(u.created_at), 'dd/MM/yyyy')}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(u.id, u.is_active)}>
                        {u.is_active ? 'Desactivar' : 'Activar'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nuevo usuario</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <Label>Nombre completo</Label>
              <Input
                placeholder="Ej: María González"
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="usuario@email.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Contraseña *</Label>
              <Input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Rol *</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Profesional</SelectItem>
                  <SelectItem value="admin">Administración</SelectItem>
                  <SelectItem value="coordinator">Coordinador</SelectItem>
                  <SelectItem value="family">Familia</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.role === 'professional' && (
              <div className="space-y-1">
                <Label>Profesión</Label>
                <Input
                  placeholder="Psicólogo/a, Psicopedagogo/a, Fonoaudiólogo/a..."
                  value={form.profession}
                  onChange={e => setForm(f => ({ ...f, profession: e.target.value }))}
                />
                <p className="text-xs text-gray-400">Se creará automáticamente la ficha del profesional.</p>
              </div>
            )}
            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear usuario
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
