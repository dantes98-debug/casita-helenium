'use client'

import { useState } from 'react'
import { format, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, LockIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8) // 8 to 21

interface Room { id: string; name: string }

interface Props {
  rooms: Room[]
  professionalId: string
}

export function BlockTimeDialog({ rooms, professionalId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const today = format(new Date(), 'yyyy-MM-dd')

  const [form, setForm] = useState({
    room_id: '',
    date: today,
    start_hour: 9,
    end_hour: 10,
    notes: '',
  })

  // Generate next 30 days for date select
  const dateOptions = Array.from({ length: 30 }, (_, i) => {
    const d = addDays(new Date(), i)
    return { value: format(d, 'yyyy-MM-dd'), label: format(d, "EEE d MMM", { locale: es }) }
  })

  async function handleBlock() {
    if (!form.room_id) { toast.error('Seleccioná un consultorio'); return }
    if (form.end_hour <= form.start_hour) { toast.error('La hora de fin debe ser posterior al inicio'); return }

    setLoading(true)
    const supabase = createClient()
    const start = new Date(`${form.date}T${String(form.start_hour).padStart(2, '0')}:00:00`).toISOString()
    const end = new Date(`${form.date}T${String(form.end_hour).padStart(2, '0')}:00:00`).toISOString()

    const { error } = await supabase.from('room_bookings').insert({
      room_id: form.room_id,
      professional_id: professionalId,
      start_time: start,
      end_time: end,
      notes: form.notes || 'Bloqueado',
      status: 'confirmed',
    })
    setLoading(false)

    if (error) {
      if (error.message?.includes('exclusion') || error.message?.includes('overlap') || error.code === 'P0001') {
        toast.error('Ese consultorio ya está reservado en ese horario')
      } else {
        toast.error('Error: ' + error.message)
      }
      return
    }

    toast.success('Tiempo bloqueado')
    setOpen(false)
    setForm(f => ({ ...f, notes: '' }))
    router.refresh()
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="border-amber-300 text-amber-700 hover:bg-amber-50"
      >
        <LockIcon className="h-4 w-4 mr-2" />
        Bloquear tiempo
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LockIcon className="h-4 w-4 text-amber-500" />
              Bloquear consultorio
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="space-y-1">
              <Label>Consultorio *</Label>
              <select
                value={form.room_id}
                onChange={e => setForm(f => ({ ...f, room_id: e.target.value }))}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
              >
                <option value="">Seleccionar...</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <Label>Fecha *</Label>
              <select
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400 capitalize"
              >
                {dateOptions.map(d => (
                  <option key={d.value} value={d.value} className="capitalize">{d.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Desde</Label>
                <select
                  value={form.start_hour}
                  onChange={e => setForm(f => ({ ...f, start_hour: Number(e.target.value) }))}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                >
                  {HOURS.slice(0, -1).map(h => (
                    <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Hasta</Label>
                <select
                  value={form.end_hour}
                  onChange={e => setForm(f => ({ ...f, end_hour: Number(e.target.value) }))}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                >
                  {HOURS.filter(h => h > form.start_hour).map(h => (
                    <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Motivo <span className="text-gray-400 text-xs">(opcional)</span></Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Ej: Supervisión, capacitación, no disponible..."
                rows={2}
              />
            </div>

            <div className="flex gap-3 justify-end pt-1">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleBlock}
                disabled={loading}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Bloquear
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
