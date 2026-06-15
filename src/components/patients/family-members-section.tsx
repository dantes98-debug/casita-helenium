'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { familyMemberSchema, FamilyMemberFormData } from '@/lib/validations/patient'
import { FamilyMember } from '@/types/database'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, MessageCircle, Mail } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

interface Props {
  patientId: string
  initialMembers: FamilyMember[]
}

export function FamilyMembersSection({ patientId, initialMembers }: Props) {
  const [members, setMembers] = useState(initialMembers)
  const [open, setOpen] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<FamilyMemberFormData>({
    resolver: zodResolver(familyMemberSchema) as any,
    defaultValues: { is_legal_guardian: false, is_payment_responsible: false, relationship: '' },
  })

  async function onSubmit(data: FamilyMemberFormData) {
    const supabase = createClient()
    const cleanData = { ...data, patient_id: patientId }
    const { data: created, error } = await supabase.from('family_members').insert(cleanData).select().single()
    if (error) { toast.error('Error al agregar familiar'); return }
    setMembers(prev => [...prev, created])
    toast.success('Familiar agregado')
    reset()
    setOpen(false)
  }

  async function handleDeleteConfirmed(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('family_members').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar'); return }
    setMembers(prev => prev.filter(m => m.id !== id))
    toast.success('Familiar eliminado')
  }

  const guardians = members.filter(m => m.is_legal_guardian || m.is_payment_responsible)
  const others = members.filter(m => !m.is_legal_guardian && !m.is_payment_responsible)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Responsables y familia</h2>
          <p className="text-xs text-gray-400 mt-0.5">Se requiere al menos un responsable</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />Agregar
        </Button>
      </div>

      {members.length === 0 ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-center text-amber-700 text-sm">
            Sin responsables registrados. Agregá al menos uno.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {guardians.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Responsables principales</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {guardians.map(m => (
                  <Card key={m.id} className="border-teal-200 bg-teal-50/30">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800">{m.last_name}, {m.first_name}</p>
                          <p className="text-sm text-gray-500 capitalize">{m.relationship}</p>
                          <div className="flex flex-col gap-1 mt-2">
                            {m.phone && (
                              <a
                                href={`https://wa.me/${m.phone.replace(/\D/g, '')}`}
                                target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-sm text-green-700 hover:text-green-800 hover:underline"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />{m.phone}
                              </a>
                            )}
                            {m.email && (
                              <a href={`mailto:${m.email}`} className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                                <Mail className="h-3.5 w-3.5" />{m.email}
                              </a>
                            )}
                          </div>
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {m.is_legal_guardian && <Badge className="text-xs bg-blue-100 text-blue-700">Tutor legal</Badge>}
                            {m.is_payment_responsible && <Badge className="text-xs bg-green-100 text-green-700">Resp. de pago</Badge>}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmId(m.id)} className="flex-shrink-0">
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {others.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Otros familiares</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {others.map(m => (
                  <Card key={m.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800">{m.last_name}, {m.first_name}</p>
                          <p className="text-sm text-gray-500 capitalize">{m.relationship}</p>
                          {m.phone && (
                            <a
                              href={`https://wa.me/${m.phone.replace(/\D/g, '')}`}
                              target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-sm text-green-700 hover:underline mt-1"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />{m.phone}
                            </a>
                          )}
                          {m.email && <p className="text-xs text-gray-400 mt-0.5">{m.email}</p>}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmId(m.id)} className="flex-shrink-0">
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={!!confirmId} onOpenChange={o => !o && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { handleDeleteConfirmed(confirmId!); setConfirmId(null) }} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Agregar familiar / responsable</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nombre *</Label>
                <Input {...register('first_name')} />
                {errors.first_name && <p className="text-xs text-red-500">{errors.first_name.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Apellido *</Label>
                <Input {...register('last_name')} />
                {errors.last_name && <p className="text-xs text-red-500">{errors.last_name.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Vínculo *</Label>
                <Select value={watch('relationship') ?? ''} onValueChange={v => setValue('relationship', v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Madre">Madre</SelectItem>
                    <SelectItem value="Padre">Padre</SelectItem>
                    <SelectItem value="Tutor/a">Tutor/a</SelectItem>
                    <SelectItem value="Abuelo/a">Abuelo/a</SelectItem>
                    <SelectItem value="Hermano/a">Hermano/a</SelectItem>
                    <SelectItem value="Tío/a">Tío/a</SelectItem>
                    <SelectItem value="Cónyuge">Cónyuge</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
                {errors.relationship && <p className="text-xs text-red-500">{errors.relationship.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>DNI</Label>
                <Input {...register('dni')} />
              </div>
              <div className="space-y-1">
                <Label>WhatsApp</Label>
                <div className="relative">
                  <MessageCircle className="absolute left-2.5 top-2.5 h-4 w-4 text-green-500" />
                  <Input {...register('phone')} className="pl-8" placeholder="+54 9 11 1234-5678" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Email <span className="text-gray-400 font-normal">(opcional)</span></Label>
                <Input type="email" {...register('email')} />
              </div>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={watch('is_legal_guardian')}
                  onCheckedChange={v => setValue('is_legal_guardian', !!v)}
                />
                Tutor legal
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={watch('is_payment_responsible')}
                  onCheckedChange={v => setValue('is_payment_responsible', !!v)}
                />
                Responsable de pago
              </label>
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Agregar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

