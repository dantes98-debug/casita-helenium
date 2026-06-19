'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Building2 } from 'lucide-react'

interface CenterSettings {
  id?: string
  center_name?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  work_hours?: string | null
  health_insurances?: string | null
}

export function SettingsForm({ initialSettings }: { initialSettings: CenterSettings | null }) {
  const [form, setForm] = useState({
    center_name: initialSettings?.center_name ?? 'La Casita Helenium',
    address: initialSettings?.address ?? '',
    phone: initialSettings?.phone ?? '',
    email: initialSettings?.email ?? '',
    work_hours: initialSettings?.work_hours ?? '',
    health_insurances: initialSettings?.health_insurances ?? '',
  })
  const [saving, setSaving] = useState(false)

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const payload = {
      center_name: form.center_name,
      address: form.address || null,
      phone: form.phone || null,
      email: form.email || null,
      work_hours: form.work_hours || null,
      health_insurances: form.health_insurances || null,
      updated_at: new Date().toISOString(),
    }

    let error
    if (initialSettings?.id) {
      ({ error } = await supabase.from('center_settings').update(payload).eq('id', initialSettings.id))
    } else {
      ({ error } = await supabase.from('center_settings').insert(payload))
    }

    setSaving(false)
    if (error) { toast.error('Error al guardar: ' + error.message); return }
    toast.success('Configuración guardada')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4 text-teal-600" />
          Datos del centro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1 sm:col-span-2">
            <Label>Nombre del centro</Label>
            <Input value={form.center_name} onChange={e => set('center_name', e.target.value)} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Dirección</Label>
            <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Av. Ejemplo 1234, Buenos Aires" />
          </div>
          <div className="space-y-1">
            <Label>Teléfono</Label>
            <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+54 11 1234-5678" />
          </div>
          <div className="space-y-1">
            <Label>Email de contacto</Label>
            <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contacto@centro.com" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Horarios de atención</Label>
            <Input value={form.work_hours} onChange={e => set('work_hours', e.target.value)} placeholder="Lun–Vie 9–18 hs, Sáb 9–13 hs" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Obras sociales aceptadas</Label>
            <Textarea
              value={form.health_insurances}
              onChange={e => set('health_insurances', e.target.value)}
              placeholder="OSDE, Swiss Medical, IOMA, Particular..."
              rows={2}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar configuración
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
