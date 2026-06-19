'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface Professional {
  id: string
  first_name: string
  last_name: string
  profession?: string | null
  specialty?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  dni?: string | null
  cuit?: string | null
  license_number?: string | null
  availability_notes?: string | null
  observations?: string | null
}

export function MyProfileForm({ professional }: { professional: Professional }) {
  const [form, setForm] = useState({
    phone: professional.phone ?? '',
    email: professional.email ?? '',
    address: professional.address ?? '',
    dni: professional.dni ?? '',
    cuit: professional.cuit ?? '',
    license_number: professional.license_number ?? '',
    availability_notes: professional.availability_notes ?? '',
    observations: professional.observations ?? '',
  })
  const [saving, setSaving] = useState(false)

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v || null]))
    const { error } = await supabase.from('professionals').update(payload).eq('id', professional.id)
    setSaving(false)
    if (error) { toast.error('Error al guardar: ' + error.message); return }
    toast.success('Perfil actualizado')
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Información profesional</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p><span className="text-gray-400">Nombre:</span> <span className="font-semibold">{professional.last_name}, {professional.first_name}</span></p>
          {professional.profession && <p><span className="text-gray-400">Profesión:</span> {professional.profession}</p>}
          {professional.specialty && <p><span className="text-gray-400">Especialidad:</span> {professional.specialty}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Datos de contacto</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Teléfono</Label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+54 11 ..." />
            </div>
            <div className="space-y-1">
              <Label>Email profesional</Label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Dirección</Label>
              <Input value={form.address} onChange={e => set('address', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>DNI</Label>
              <Input value={form.dni} onChange={e => set('dni', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>CUIT</Label>
              <Input value={form.cuit} onChange={e => set('cuit', e.target.value)} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Matrícula</Label>
              <Input value={form.license_number} onChange={e => set('license_number', e.target.value)} placeholder="Número de matrícula profesional" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Disponibilidad horaria</Label>
              <Input value={form.availability_notes} onChange={e => set('availability_notes', e.target.value)} placeholder="Ej: Lunes y miércoles 9–18 hs" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Observaciones</Label>
              <Textarea value={form.observations} onChange={e => set('observations', e.target.value)} rows={3} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar cambios
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
