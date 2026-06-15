'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CheckCircle2, UserX, Loader2, FileText } from 'lucide-react'

interface Props {
  appointment: {
    id: string
    patient_id: string
    patient_name: string
    professional_name: string
    start_time: string
  }
  open: boolean
  onClose: () => void
  onDone: (id: string, status: string) => void
}

export function QuickSessionDialog({ appointment, open, onClose, onDone }: Props) {
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState<'completed' | 'no_show' | null>(null)

  async function handleSubmit(status: 'completed' | 'no_show') {
    setSaving(status)
    const supabase = createClient()

    // Update appointment status
    const { error: apptError } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', appointment.id)

    if (apptError) { toast.error('Error al actualizar el turno'); setSaving(null); return }

    // If there are notes, create a clinical evolution
    if (notes.trim() && status === 'completed') {
      // Get or create clinical record
      const { data: record } = await supabase
        .from('clinical_records')
        .select('id')
        .eq('patient_id', appointment.patient_id)
        .single()

      if (record) {
        await supabase.from('clinical_evolutions').insert({
          clinical_record_id: record.id,
          session_number: null,
          content: notes.trim(),
          session_type: 'individual',
        })
      }
    }

    toast.success(status === 'completed' ? 'Sesión registrada' : 'Ausencia registrada')
    onDone(appointment.id, status)
    setNotes('')
    setSaving(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-500" />
            Registrar sesión
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p className="font-medium text-gray-800">{appointment.patient_name}</p>
            <p className="text-gray-500 text-xs mt-0.5">
              {appointment.professional_name} · {new Date(appointment.start_time).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div className="space-y-1">
            <Label>Nota de sesión <span className="text-gray-400 font-normal">(opcional)</span></Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Resumen de la sesión, evolución del paciente, objetivos trabajados..."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-gray-400">Se guarda en la historia clínica del paciente.</p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => handleSubmit('no_show')}
              disabled={!!saving}
            >
              {saving === 'no_show' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserX className="h-4 w-4 mr-2" />}
              Ausente
            </Button>
            <Button
              className="flex-1 bg-teal-600 hover:bg-teal-700"
              onClick={() => handleSubmit('completed')}
              disabled={!!saving}
            >
              {saving === 'completed' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Realizada
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
