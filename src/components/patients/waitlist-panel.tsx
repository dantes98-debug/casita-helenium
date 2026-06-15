'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Clock, UserCheck, Calendar, Loader2, Phone } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Patient {
  id: string; first_name: string; last_name: string; phone?: string
  admission_date?: string; observations?: string
  primary_professional?: { first_name: string; last_name: string } | null
}
interface Professional { id: string; first_name: string; last_name: string; profession: string }

interface Props { patients: Patient[]; professionals: Professional[] }

export function WaitlistPanel({ patients: init, professionals }: Props) {
  const router = useRouter()
  const [patients, setPatients] = useState(init)
  const [assignTarget, setAssignTarget] = useState<Patient | null>(null)
  const [profId, setProfId] = useState('')
  const [apptDate, setApptDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [apptTime, setApptTime] = useState('10:00')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function assignAndSchedule() {
    if (!profId) { toast.error('Seleccioná un profesional'); return }
    if (!assignTarget) return
    setSaving(true)
    const supabase = createClient()

    // Assign professional and move to active
    const { error: patError } = await supabase.from('patients')
      .update({ primary_professional_id: profId, status: 'active' })
      .eq('id', assignTarget.id)

    if (patError) { toast.error('Error al actualizar paciente'); setSaving(false); return }

    // Create first appointment
    const startTime = `${apptDate}T${apptTime}:00`
    const endTime = `${apptDate}T${String(parseInt(apptTime.split(':')[0]) + 1).padStart(2, '0')}:${apptTime.split(':')[1]}:00`
    await supabase.from('appointments').insert({
      patient_id: assignTarget.id,
      professional_id: profId,
      start_time: startTime,
      end_time: endTime,
      status: 'confirmed',
      notes: notes || null,
    })

    toast.success(`${assignTarget.last_name} asignado/a y primer turno creado`)
    setPatients(prev => prev.filter(p => p.id !== assignTarget.id))
    setAssignTarget(null)
    setProfId(''); setNotes('')
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-500" />
          <h2 className="font-semibold text-gray-800">Lista de espera</h2>
          <Badge className="bg-amber-100 text-amber-700">{patients.length}</Badge>
        </div>
        <p className="text-xs text-gray-400">Asignales un profesional y creá el primer turno</p>
      </div>

      {patients.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-gray-400">
          <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          No hay pacientes en lista de espera.
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {patients.map(p => (
            <Card key={p.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Link href={`/patients/${p.id}`} className="font-semibold text-gray-800 hover:text-teal-600 hover:underline">
                      {p.last_name}, {p.first_name}
                    </Link>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {p.phone && (
                        <a href={`tel:${p.phone}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-teal-600">
                          <Phone className="h-3 w-3" />{p.phone}
                        </a>
                      )}
                      {p.admission_date && (
                        <span className="text-xs text-gray-400">
                          En espera desde {format(new Date(p.admission_date), "d 'de' MMMM", { locale: es })}
                        </span>
                      )}
                    </div>
                    {p.observations && <p className="text-xs text-gray-400 mt-1 truncate">{p.observations}</p>}
                  </div>
                  <Button
                    size="sm"
                    className="bg-teal-600 hover:bg-teal-700 flex-shrink-0"
                    onClick={() => { setAssignTarget(p); setProfId('') }}
                  >
                    <UserCheck className="h-3.5 w-3.5 mr-1.5" />Asignar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!assignTarget} onOpenChange={o => { if (!o) setAssignTarget(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-teal-500" />
              Asignar paciente — {assignTarget?.last_name}, {assignTarget?.first_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Profesional *</Label>
              <select value={profId} onChange={e => setProfId(e.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500">
                <option value="">Seleccionar...</option>
                {professionals.map(p => <option key={p.id} value={p.id}>{p.last_name}, {p.first_name} ({p.profession})</option>)}
              </select>
            </div>
            <div className="bg-teal-50 rounded-lg p-3 space-y-3">
              <p className="text-xs font-medium text-teal-700 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Primer turno</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Fecha</Label><Input type="date" value={apptDate} onChange={e => setApptDate(e.target.value)} /></div>
                <div className="space-y-1"><Label>Hora</Label><Input type="time" value={apptTime} onChange={e => setApptTime(e.target.value)} /></div>
              </div>
              <div className="space-y-1">
                <Label>Notas <span className="text-gray-400 font-normal">(opcional)</span></Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Motivo de derivación, urgencias..." />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setAssignTarget(null)}>Cancelar</Button>
              <Button className="bg-teal-600 hover:bg-teal-700" onClick={assignAndSchedule} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Asignar y agendar turno
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
