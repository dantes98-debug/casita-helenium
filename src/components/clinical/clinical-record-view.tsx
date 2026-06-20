'use client'

import { useState } from 'react'
import { ClinicalRecord, ClinicalNote } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Loader2, Lock, FileText, Pencil } from 'lucide-react'

type NoteRow = ClinicalNote & {
  professional?: { first_name: string; last_name: string; profession: string } | null
}

const noteTypeLabels: Record<string, string> = {
  evolution: 'Evolución', report: 'Informe', certificate: 'Certificado',
  consent: 'Consentimiento', referral: 'Derivación', other: 'Otro',
}

const noteSchema = z.object({
  note_type: z.string().default('evolution'),
  date: z.string().min(1),
  attendance: z.boolean().default(true),
  session_type: z.string().optional(),
  interventions: z.string().optional(),
  clinical_observations: z.string().optional(),
  next_objectives: z.string().optional(),
  is_confidential: z.boolean().default(false),
  professional_id: z.string().uuid(),
})
type NoteForm = z.infer<typeof noteSchema>

interface Props {
  record: ClinicalRecord
  notes: NoteRow[]
  patientId: string
  professionals: { id: string; first_name: string; last_name: string; profession: string }[]
  defaultTab?: string
}

export function ClinicalRecordView({ record, notes: initialNotes, patientId, professionals, defaultTab = 'summary' }: Props) {
  const [notes, setNotes] = useState(initialNotes)
  const [openNote, setOpenNote] = useState(false)
  const [editingSummary, setEditingSummary] = useState(false)
  const [summary, setSummary] = useState({
    reason_for_consultation: record.reason_for_consultation ?? '',
    background: record.background ?? '',
    presumptive_diagnosis: record.presumptive_diagnosis ?? '',
    confirmed_diagnosis: record.confirmed_diagnosis ?? '',
    therapeutic_objectives: record.therapeutic_objectives ?? '',
    treatment_plan: record.treatment_plan ?? '',
    admission_interview: (record as any).admission_interview ?? '',
  })
  const [savingSummary, setSavingSummary] = useState(false)

  const { register, handleSubmit, setValue, watch, reset, formState: { isSubmitting } } = useForm<NoteForm>({
    resolver: zodResolver(noteSchema) as any,
    defaultValues: {
      note_type: 'evolution', date: new Date().toISOString().split('T')[0],
      attendance: true, is_confidential: false,
      professional_id: professionals[0]?.id ?? '',
    },
  })

  async function onSubmitNote(data: NoteForm) {
    const supabase = createClient()
    const { data: created, error } = await supabase.from('clinical_notes')
      .insert({
        ...data, clinical_record_id: record.id,
        session_type: data.session_type || null,
        interventions: data.interventions || null,
        clinical_observations: data.clinical_observations || null,
        next_objectives: data.next_objectives || null,
      })
      .select(`*, professional:professionals(first_name, last_name, profession)`)
      .single()
    if (error) { toast.error('Error al guardar evolución'); return }
    setNotes(prev => [created as NoteRow, ...prev])
    toast.success('Evolución guardada')
    reset()
    setOpenNote(false)
  }

  async function saveSummary() {
    setSavingSummary(true)
    const supabase = createClient()
    const payload = Object.fromEntries(
      Object.entries(summary).map(([k, v]) => [k, v.trim() || null])
    )
    const { error } = await supabase.from('clinical_records').update(payload).eq('id', record.id)
    setSavingSummary(false)
    if (error) { toast.error('Error al guardar: ' + error.message); return }
    toast.success('Resumen clínico actualizado')
    setEditingSummary(false)
  }

  const summaryFields: { key: keyof typeof summary; label: string; rows?: number }[] = [
    { key: 'reason_for_consultation', label: 'Motivo de consulta', rows: 3 },
    { key: 'background', label: 'Antecedentes relevantes', rows: 3 },
    { key: 'presumptive_diagnosis', label: 'Diagnóstico presuntivo', rows: 2 },
    { key: 'confirmed_diagnosis', label: 'Diagnóstico confirmado', rows: 2 },
    { key: 'therapeutic_objectives', label: 'Objetivos terapéuticos', rows: 3 },
    { key: 'treatment_plan', label: 'Plan de tratamiento', rows: 3 },
    { key: 'admission_interview', label: 'Entrevista de admisión', rows: 3 },
  ]

  return (
    <div className="space-y-6">
      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="summary">Resumen clínico</TabsTrigger>
          <TabsTrigger value="notes">Evoluciones ({notes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Historia clínica base</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setEditingSummary(true)}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />Editar
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {summaryFields.map(({ key, label }) => summary[key] ? (
                <div key={key}>
                  <p className="font-medium text-gray-500 text-xs uppercase tracking-wide">{label}</p>
                  <p className="mt-1 whitespace-pre-wrap">{summary[key]}</p>
                </div>
              ) : null)}
              {summaryFields.every(f => !summary[f.key]) && (
                <p className="text-gray-400 text-center py-4">
                  Sin datos clínicos aún.{' '}
                  <button className="text-teal-600 underline" onClick={() => setEditingSummary(true)}>
                    Completar resumen clínico
                  </button>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Edit summary dialog */}
          <Dialog open={editingSummary} onOpenChange={setEditingSummary}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Editar resumen clínico</DialogTitle></DialogHeader>
              <div className="space-y-4">
                {summaryFields.map(({ key, label, rows }) => (
                  <div key={key} className="space-y-1">
                    <Label>{label}</Label>
                    <Textarea
                      value={summary[key]}
                      onChange={e => setSummary(prev => ({ ...prev, [key]: e.target.value }))}
                      rows={rows ?? 2}
                      placeholder={label + '...'}
                    />
                  </div>
                ))}
                <div className="flex gap-3 justify-end pt-2">
                  <Button variant="outline" onClick={() => setEditingSummary(false)}>Cancelar</Button>
                  <Button onClick={saveSummary} disabled={savingSummary} className="bg-teal-600 hover:bg-teal-700">
                    {savingSummary && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="notes" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { reset(); setOpenNote(true) }} className="bg-teal-600 hover:bg-teal-700">
              <Plus className="h-4 w-4 mr-2" />Nueva evolución
            </Button>
          </div>

          {notes.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-gray-400">Sin evoluciones registradas</CardContent></Card>
          ) : notes.map(note => (
            <Card key={note.id} className={note.is_confidential ? 'border-red-200 bg-red-50/30' : ''}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{format(new Date(note.date), "dd 'de' MMMM yyyy", { locale: es })}</span>
                    <Badge className="text-xs bg-teal-100 text-teal-700">{noteTypeLabels[note.note_type]}</Badge>
                    {!note.attendance && <Badge className="text-xs bg-orange-100 text-orange-700">Ausente</Badge>}
                    {note.is_confidential && (
                      <Badge className="text-xs bg-red-100 text-red-700 flex items-center gap-1">
                        <Lock className="h-3 w-3" />Confidencial
                      </Badge>
                    )}
                    {note.session_type && (
                      <Badge className="text-xs bg-gray-100 text-gray-600">{note.session_type}</Badge>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {note.professional?.last_name}, {note.professional?.first_name} — {note.professional?.profession}
                  </span>
                </div>
                {note.interventions && (
                  <div><p className="text-xs font-medium text-gray-500 uppercase">Intervenciones</p><p className="text-sm mt-1">{note.interventions}</p></div>
                )}
                {note.clinical_observations && (
                  <div><p className="text-xs font-medium text-gray-500 uppercase">Observaciones clínicas</p><p className="text-sm mt-1">{note.clinical_observations}</p></div>
                )}
                {note.next_objectives && (
                  <div><p className="text-xs font-medium text-gray-500 uppercase">Próximos objetivos</p><p className="text-sm mt-1">{note.next_objectives}</p></div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* New note dialog */}
      <Dialog open={openNote} onOpenChange={setOpenNote}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nueva evolución</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmitNote)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Profesional *</Label>
                <Select value={watch('professional_id')} onValueChange={v => setValue('professional_id', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.last_name}, {p.first_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={watch('note_type')} onValueChange={v => setValue('note_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(noteTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Fecha</Label>
                <Input type="date" {...register('date')} />
              </div>
              <div className="space-y-1">
                <Label>Tipo de sesión</Label>
                <Select value={watch('session_type') ?? ''} onValueChange={v => setValue('session_type', v || undefined)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="grupal">Grupal</SelectItem>
                    <SelectItem value="vincular">Vincular</SelectItem>
                    <SelectItem value="familiar">Familiar</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={watch('attendance')} onCheckedChange={v => setValue('attendance', !!v)} />
                Paciente presente
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={watch('is_confidential')} onCheckedChange={v => setValue('is_confidential', !!v)} />
                <Lock className="h-3.5 w-3.5 text-red-500" />
                Nota confidencial
              </label>
            </div>
            <div className="space-y-1">
              <Label>Intervenciones realizadas</Label>
              <Textarea {...register('interventions')} rows={3} placeholder="Técnicas utilizadas, recursos terapéuticos..." />
            </div>
            <div className="space-y-1">
              <Label>Observaciones clínicas</Label>
              <Textarea {...register('clinical_observations')} rows={3} placeholder="Estado del paciente, evolución, aspectos relevantes..." />
            </div>
            <div className="space-y-1">
              <Label>Próximos objetivos</Label>
              <Textarea {...register('next_objectives')} rows={2} placeholder="Objetivos para la próxima sesión..." />
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpenNote(false)}>Cancelar</Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar evolución
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
