'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CheckCircle2, UserX, Loader2, FileText, ArrowRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface Props {
  appointment: {
    id: string
    patient_id: string
    patient_name: string
    professional_name: string
    start_time: string
    professional_id?: string
  }
  open: boolean
  onClose: () => void
  onDone: (id: string, status: string) => void
}

export function QuickSessionDialog({ appointment, open, onClose, onDone }: Props) {
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState<'completed' | 'no_show' | null>(null)
  const [done, setDone] = useState<'completed' | 'no_show' | null>(null)
  const router = useRouter()

  async function handleSubmit(status: 'completed' | 'no_show') {
    setSaving(status)
    const supabase = createClient()

    const { error: apptError } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', appointment.id)

    if (apptError) { toast.error('Error al actualizar el turno'); setSaving(null); return }

    // Save note as a clinical evolution when session completed and there are notes
    if (notes.trim() && status === 'completed') {
      const { data: record } = await supabase
        .from('clinical_records')
        .select('id')
        .eq('patient_id', appointment.patient_id)
        .single()

      if (record) {
        // Get professional_id for the note
        let professionalId = appointment.professional_id ?? null
        if (!professionalId) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: prof } = await supabase
              .from('professionals')
              .select('id')
              .eq('user_id', user.id)
              .maybeSingle()
            professionalId = prof?.id ?? null
          }
        }

        if (professionalId) {
          await supabase.from('clinical_notes').insert({
            clinical_record_id: record.id,
            note_type: 'evolution',
            date: appointment.start_time.split('T')[0],
            attendance: true,
            session_type: 'individual',
            clinical_observations: notes.trim(),
            is_confidential: false,
            professional_id: professionalId,
          })
        }
      }
    }

    toast.success(status === 'completed' ? 'Sesión registrada' : 'Ausencia registrada')
    onDone(appointment.id, status)
    setNotes('')
    setSaving(null)
    setDone(status)
  }

  function handleClose() {
    setDone(null)
    onClose()
  }

  // After saving — show confirmation with link to HC
  if (done) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-teal-500" />
              {done === 'completed' ? 'Sesión registrada' : 'Ausencia registrada'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="font-medium text-gray-800">{appointment.patient_name}</p>
              <p className="text-gray-500 text-xs mt-0.5">
                {format(parseISO(appointment.start_time), "EEEE d 'de' MMMM, HH:mm", { locale: es })}
              </p>
            </div>
            {done === 'completed' && (
              <p className="text-sm text-gray-600">
                {notes.trim() ? 'La nota se guardó en la historia clínica.' : '¿Querés escribir la evolución completa?'}
              </p>
            )}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Cerrar
              </Button>
              {done === 'completed' && (
                <Button
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                  onClick={() => {
                    handleClose()
                    router.push(`/patients/${appointment.patient_id}/clinical-record`)
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Historia clínica
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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
              {appointment.professional_name} · {format(parseISO(appointment.start_time), "EEEE d 'de' MMMM, HH:mm", { locale: es })}
            </p>
          </div>

          <div className="space-y-1">
            <Label>Nota de sesión <span className="text-gray-400 font-normal">(opcional)</span></Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Resumen breve de la sesión. Para una evolución completa usá la Historia Clínica."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-gray-400">Se guarda en las observaciones clínicas de la HC.</p>
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

          <div className="border-t pt-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-teal-600 hover:text-teal-700 hover:bg-teal-50"
              onClick={() => {
                handleClose()
                router.push(`/patients/${appointment.patient_id}/clinical-record`)
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              Ir directo a Historia Clínica
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
