'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CheckCircle2, UserX, Loader2, FileText, ArrowRight, Lock, SkipForward } from 'lucide-react'
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

type Step = 'confirm' | 'evolution' | 'done'

export function QuickSessionDialog({ appointment, open, onClose, onDone }: Props) {
  const [step, setStep] = useState<Step>('confirm')
  const [savingNoShow, setSavingNoShow] = useState(false)
  const [savingEvolution, setSavingEvolution] = useState(false)

  const [sessionType, setSessionType] = useState('individual')
  const [interventions, setInterventions] = useState('')
  const [observations, setObservations] = useState('')
  const [nextObjectives, setNextObjectives] = useState('')
  const [isConfidential, setIsConfidential] = useState(false)

  const router = useRouter()

  async function handleNoShow() {
    setSavingNoShow(true)
    const supabase = createClient()
    const { error } = await supabase.from('appointments').update({ status: 'no_show' }).eq('id', appointment.id)
    setSavingNoShow(false)
    if (error) { toast.error('Error al registrar ausencia'); return }
    toast.success('Ausencia registrada')
    onDone(appointment.id, 'no_show')
    setStep('done')
  }

  async function handleRealizada() {
    const supabase = createClient()
    const { error } = await supabase.from('appointments').update({ status: 'completed' }).eq('id', appointment.id)
    if (error) { toast.error('Error al actualizar el turno'); return }
    onDone(appointment.id, 'completed')
    setStep('evolution')
  }

  async function saveEvolution(skip = false) {
    setSavingEvolution(true)
    const supabase = createClient()

    if (!skip && (observations.trim() || interventions.trim() || nextObjectives.trim())) {
      const { data: record } = await supabase
        .from('clinical_records')
        .select('id')
        .eq('patient_id', appointment.patient_id)
        .single()

      if (record) {
        let professionalId = appointment.professional_id ?? null
        if (!professionalId) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: prof } = await supabase.from('professionals').select('id').eq('user_id', user.id).maybeSingle()
            professionalId = prof?.id ?? null
          }
        }
        if (professionalId) {
          await supabase.from('clinical_notes').insert({
            clinical_record_id: record.id,
            note_type: 'evolution',
            date: appointment.start_time.split('T')[0],
            attendance: true,
            session_type: sessionType,
            interventions: interventions.trim() || null,
            clinical_observations: observations.trim() || null,
            next_objectives: nextObjectives.trim() || null,
            is_confidential: isConfidential,
            professional_id: professionalId,
          })
          toast.success('Evolución guardada')
        }
      }
    }

    setSavingEvolution(false)
    setStep('done')
  }

  function handleClose() {
    setStep('confirm')
    setInterventions('')
    setObservations('')
    setNextObjectives('')
    setIsConfidential(false)
    setSessionType('individual')
    onClose()
  }

  const patientCard = (
    <div className="bg-gray-50 rounded-lg p-3 text-sm">
      <p className="font-medium text-gray-800">{appointment.patient_name}</p>
      <p className="text-gray-500 text-xs mt-0.5">
        {appointment.professional_name} · {format(parseISO(appointment.start_time), "EEEE d 'de' MMMM, HH:mm", { locale: es })}
      </p>
    </div>
  )

  if (step === 'confirm') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-teal-500" />Registrar sesión
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {patientCard}
            <p className="text-sm text-gray-600">¿Cómo resultó el turno?</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                onClick={handleNoShow} disabled={savingNoShow}>
                {savingNoShow ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserX className="h-4 w-4 mr-2" />}
                Paciente ausente
              </Button>
              <Button className="flex-1 bg-teal-600 hover:bg-teal-700" onClick={handleRealizada}>
                <CheckCircle2 className="h-4 w-4 mr-2" />Sesión realizada
              </Button>
            </div>
            <div className="border-t pt-3">
              <Button variant="ghost" size="sm" className="w-full text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                onClick={() => { handleClose(); router.push(`/patients/${appointment.patient_id}/clinical-record`) }}>
                <FileText className="h-4 w-4 mr-2" />Ir directo a Historia Clínica
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (step === 'evolution') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-teal-500" />Nueva evolución
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {patientCard}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo de sesión</Label>
                <Select value={sessionType} onValueChange={setSessionType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="grupal">Grupal</SelectItem>
                    <SelectItem value="vincular">Vincular</SelectItem>
                    <SelectItem value="familiar">Familiar</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={isConfidential} onCheckedChange={v => setIsConfidential(!!v)} />
                  <Lock className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-xs">Confidencial</span>
                </label>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Intervenciones realizadas</Label>
              <Textarea value={interventions} onChange={e => setInterventions(e.target.value)}
                rows={2} placeholder="Técnicas, recursos terapéuticos..." className="resize-none" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Observaciones clínicas</Label>
              <Textarea value={observations} onChange={e => setObservations(e.target.value)}
                rows={3} placeholder="Estado del paciente, evolución, aspectos relevantes..." className="resize-none" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Próximos objetivos</Label>
              <Textarea value={nextObjectives} onChange={e => setNextObjectives(e.target.value)}
                rows={2} placeholder="Objetivos para la próxima sesión..." className="resize-none" />
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600"
                onClick={() => saveEvolution(true)} disabled={savingEvolution}>
                <SkipForward className="h-4 w-4 mr-1" />Saltar
              </Button>
              <Button className="flex-1 bg-teal-600 hover:bg-teal-700" onClick={() => saveEvolution(false)} disabled={savingEvolution}>
                {savingEvolution ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Guardar evolución
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Done state
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-teal-500" />Sesión registrada
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {patientCard}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleClose}>Cerrar</Button>
            <Button className="flex-1 bg-teal-600 hover:bg-teal-700"
              onClick={() => { handleClose(); router.push(`/patients/${appointment.patient_id}/clinical-record`) }}>
              <FileText className="h-4 w-4 mr-2" />Historia clínica<ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
