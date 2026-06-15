'use client'

import { useState, useRef } from 'react'
import { Document } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Upload, Loader2, FileText, Download, Search } from 'lucide-react'

type DocumentRow = Document & {
  patient?: { first_name: string; last_name: string } | null
  professional?: { first_name: string; last_name: string } | null
  uploader?: { full_name: string } | null
}

const uploadSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  type: z.string().min(1, 'Tipo requerido'),
  patient_id: z.string().optional(),
  professional_id: z.string().optional(),
  is_clinical: z.boolean().default(false),
})
type UploadForm = z.infer<typeof uploadSchema>

interface Props {
  documents: DocumentRow[]
  patients: { id: string; first_name: string; last_name: string }[]
  professionals: { id: string; first_name: string; last_name: string }[]
}

export function DocumentsView({ documents: initial, patients, professionals }: Props) {
  const [documents, setDocuments] = useState(initial)
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<UploadForm>({
    resolver: zodResolver(uploadSchema) as any,
    defaultValues: { is_clinical: false },
  })

  const filtered = documents.filter(d => {
    const text = `${d.name} ${d.type} ${d.patient?.first_name ?? ''} ${d.patient?.last_name ?? ''}`.toLowerCase()
    return text.includes(search.toLowerCase())
  })

  async function onUpload(data: UploadForm) {
    if (!file) { toast.error('Seleccioná un archivo'); return }
    setUploading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const ext = file.name.split('.').pop()
    const path = `documents/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error: uploadError } = await supabase.storage.from('documents').upload(path, file)
    if (uploadError) { toast.error('Error al subir archivo'); setUploading(false); return }

    const { data: created, error } = await supabase.from('documents').insert({
      name: data.name, type: data.type, storage_path: path,
      patient_id: data.patient_id || null, professional_id: data.professional_id || null,
      is_clinical: data.is_clinical, mime_type: file.type, file_size: file.size,
      uploaded_by: user?.id,
    }).select('*, patient:patients(first_name, last_name), professional:professionals(first_name, last_name), uploader:profiles(full_name)').single()

    setUploading(false)
    if (error) { toast.error('Error al registrar documento'); return }
    setDocuments(prev => [created as DocumentRow, ...prev])
    toast.success('Documento subido exitosamente')
    reset(); setFile(null); setOpen(false)
  }

  async function handleDownload(doc: DocumentRow) {
    const supabase = createClient()
    const { data } = await supabase.storage.from('documents').createSignedUrl(doc.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Buscar documentos..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => { reset(); setFile(null); setOpen(true) }} className="bg-teal-600 hover:bg-teal-700">
          <Upload className="h-4 w-4 mr-2" />Subir documento
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Asociado a</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Subido por</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin documentos</td></tr>
                ) : filtered.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                      <span>{d.name}</span>
                      {d.is_clinical && <Badge className="text-xs bg-red-100 text-red-600">Clínico</Badge>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{d.type}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {d.patient ? `Paciente: ${d.patient.last_name}, ${d.patient.first_name}` :
                       d.professional ? `Prof: ${d.professional.last_name}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{(d.uploader as { full_name: string } | null)?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{format(new Date(d.created_at), 'dd/MM/yyyy')}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleDownload(d)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Subir documento</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onUpload)} className="space-y-4">
            <div className="space-y-1">
              <Label>Archivo</Label>
              <input ref={fileRef} type="file" className="block w-full text-sm border rounded-md px-3 py-2 cursor-pointer"
                onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); if (!watch('name')) setValue('name', f.name) } }} />
            </div>
            <div className="space-y-1">
              <Label>Nombre del documento *</Label>
              <Input {...register('name')} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Tipo *</Label>
              <Select value={watch('type') ?? ''} onValueChange={v => setValue('type', v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar tipo..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="consentimiento">Consentimiento informado</SelectItem>
                  <SelectItem value="informe">Informe</SelectItem>
                  <SelectItem value="certificado">Certificado</SelectItem>
                  <SelectItem value="comprobante">Comprobante de pago</SelectItem>
                  <SelectItem value="matricula">Matrícula profesional</SelectItem>
                  <SelectItem value="contrato">Contrato/Acuerdo</SelectItem>
                  <SelectItem value="evaluacion">Evaluación</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && <p className="text-xs text-red-500">{errors.type.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Paciente</Label>
              <Select value={watch('patient_id') ?? '__none__'} onValueChange={v => setValue('patient_id', v === '__none__' ? undefined : v)}>
                <SelectTrigger><SelectValue placeholder="Sin asociar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin paciente</SelectItem>
                  {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.last_name}, {p.first_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={watch('is_clinical')} onCheckedChange={v => setValue('is_clinical', !!v)} />
              Documento clínico (acceso restringido)
            </label>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={uploading}>
                {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Subir
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}



