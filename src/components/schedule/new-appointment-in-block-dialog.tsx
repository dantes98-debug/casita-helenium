'use client'

import { useState, useEffect } from 'react'
import { format, parseISO, addMinutes } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Clock, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Block {
  id: string
  room_id: string
  start_time: string
  end_time: string
  room?: { id: string; name: string } | null
}

interface Patient { id: string; first_name: string; last_name: string }

interface Appointment {
  id: string
  patient_id: string
  start_time: string
  end_time: string
  status: string
  patient?: { first_name: string; last_name: string } | null
}

interface Props {
  block: Block
  patients: Patient[]
  professionalId: string
  onClose: () => void
  onCreated: (appt: Appointment) => void
}

export function NewAppointmentInBlockDialog({ block, patients, professionalId, onClose, onCreated }: Props) {
  const [patientId, setPatientId] = useState(patients[0]?.id ?? '')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const blockStart = parseISO(block.start_time)
  const blockEnd = parseISO(block.end_time)
  const minDatetime = format(blockStart, "yyyy-MM-dd'T'HH:mm")
  const maxDatetime = format(blockEnd, "yyyy-MM-dd'T'HH:mm")

  useEffect(() => {
    setStartTime(format(blockStart, "yyyy-MM-dd'T'HH:mm"))
    setEndTime(format(addMinutes(blockStart, 50), "yyyy-MM-dd'T'HH:mm"))
    setPatientId(patients[0]?.id ?? '')
    setNotes('')
  }, [block.id])

  async function handleSave() {
    if (!patientId || !startTime || !endTime) { toast.error('Completá todos los campos'); return }
    const st = new Date(startTime)
    const et = new Date(endTime)
    if (st >= et) { toast.error('La hora de inicio debe ser antes que la de fin'); return }
    if (st < blockStart || et > blockEnd) {
      toast.error(`El turno debe estar dentro del bloque (${format(blockStart, 'HH:mm')} – ${format(blockEnd, 'HH:mm')})`)
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        professional_id: professionalId,
        patient_id: patientId,
        room_id: block.room_id,
        start_time: st.toISOString(),
        end_time: et.toISOString(),
        status: 'reserved',
        notes: notes || null,
      })
      .select('id, patient_id, start_time, end_time, status, patient:patients(first_name, last_name)')
      .single()
    setLoading(false)
    if (error) { toast.error('Error al crear turno: ' + error.message); return }
    onCreated(data as Appointment)
    toast.success('Turno agendado')
    onClose()
  }

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Agendar turno</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg bg-teal-50 border border-teal-100 px-3 py-2 text-sm text-teal-700 flex items-center gap-3 mb-2">
          <Building2 className="h-4 w-4 flex-shrink-0" />
          <span>{block.room?.name} · {format(blockStart, 'HH:mm')} – {format(blockEnd, 'HH:mm')}</span>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Paciente</Label>
            <select
              value={patientId}
              onChange={e => setPatientId(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.last_name}, {p.first_name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Desde</Label>
              <input
                type="datetime-local"
                value={startTime}
                min={minDatetime}
                max={maxDatetime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div className="space-y-1">
              <Label>Hasta</Label>
              <input
                type="datetime-local"
                value={endTime}
                min={minDatetime}
                max={maxDatetime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observaciones de la sesión..."
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} disabled={loading} className="flex-1 bg-teal-600 hover:bg-teal-700">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar turno
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
