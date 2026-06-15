'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Link2, Unlink, Loader2, User } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'

interface Profile { id: string; email: string; full_name?: string | null }

interface Props {
  professionalId: string
  linkedUserId?: string | null
  linkedEmail?: string | null
  availableProfiles: Profile[]
}

export function LinkUserSection({ professionalId, linkedUserId, linkedEmail, availableProfiles }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLink() {
    if (!selectedUserId) { toast.error('Seleccioná un usuario'); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('professionals')
      .update({ user_id: selectedUserId })
      .eq('id', professionalId)
    setLoading(false)
    if (error) { toast.error('Error al vincular: ' + error.message); return }
    toast.success('Usuario vinculado correctamente')
    setOpen(false)
    router.refresh()
  }

  async function handleUnlink() {
    if (!confirm('¿Desvinculás este usuario? El profesional ya no podrá ver su agenda.')) return
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('professionals')
      .update({ user_id: null })
      .eq('id', professionalId)
    setLoading(false)
    if (error) { toast.error('Error al desvincular'); return }
    toast.success('Usuario desvinculado')
    router.refresh()
  }

  return (
    <>
      <Card className={linkedUserId ? 'border-teal-200 bg-teal-50/30' : 'border-amber-200 bg-amber-50/30'}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Link2 className="h-4 w-4" />Usuario del sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          {linkedUserId ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{linkedEmail}</p>
                  <Badge className="text-xs bg-teal-100 text-teal-700 mt-0.5">Vinculado</Badge>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleUnlink} disabled={loading} className="text-red-500 hover:text-red-600">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-amber-700">Sin usuario vinculado — el profesional no puede ver su agenda.</p>
              <Button size="sm" onClick={() => setOpen(true)} className="bg-teal-600 hover:bg-teal-700 flex-shrink-0">
                <Link2 className="h-3.5 w-3.5 mr-1.5" />Vincular
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-teal-500" />Vincular usuario al profesional
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Seleccioná el usuario que corresponde a este profesional. Una vez vinculado podrá ver su agenda y liquidación en &quot;Mi agenda&quot;.
            </p>
            <div className="space-y-1">
              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="">Seleccionar usuario...</option>
                {availableProfiles.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.full_name ? `${p.full_name} — ` : ''}{p.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleLink} disabled={loading || !selectedUserId} className="bg-teal-600 hover:bg-teal-700">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Vincular
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
