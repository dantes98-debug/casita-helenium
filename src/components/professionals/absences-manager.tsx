'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Trash2 } from 'lucide-react'

export interface Absence {
  id: string
  start_date: string
  end_date: string
  reason: string | null
  created_at: string
}

interface Props {
  professionalId: string
  initialAbsences: Absence[]
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end)
  const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
  return diff + 1
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

export function AbsencesManager({ professionalId, initialAbsences }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [absences, setAbsences] = useState<Absence[]>(initialAbsences)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    if (!startDate || !endDate) {
      setError('Ingresá fecha de inicio y fin.')
      return
    }
    if (endDate < startDate) {
      setError('La fecha de fin debe ser igual o posterior a la de inicio.')
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: insertError } = await (supabase as any)
      .from('professional_absences')
      .insert({ professional_id: professionalId, start_date: startDate, end_date: endDate, reason: reason || null })
      .select()
      .single()
    setLoading(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setAbsences(prev => [data as Absence, ...prev])
    setStartDate('')
    setEndDate('')
    setReason('')
    router.refresh()
  }

  async function handleDelete(id: string) {
    await (supabase as any).from('professional_absences').delete().eq('id', id)
    setAbsences(prev => prev.filter(a => a.id !== id))
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agregar ausencia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="start_date">Desde</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="end_date">Hasta</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Input
                id="reason"
                type="text"
                placeholder="Vacaciones, licencia..."
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
          <Button
            className="mt-4 bg-teal-600 hover:bg-teal-700"
            onClick={handleAdd}
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Agregar'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ausencias registradas</CardTitle>
        </CardHeader>
        <CardContent>
          {absences.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Sin ausencias registradas</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500 text-xs uppercase">
                    <th className="text-left py-2 pr-4 font-medium">Desde</th>
                    <th className="text-left py-2 pr-4 font-medium">Hasta</th>
                    <th className="text-left py-2 pr-4 font-medium">Duración (días)</th>
                    <th className="text-left py-2 pr-4 font-medium">Motivo</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {absences.map(a => (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2 pr-4">{formatDate(a.start_date)}</td>
                      <td className="py-2 pr-4">{formatDate(a.end_date)}</td>
                      <td className="py-2 pr-4">{daysBetween(a.start_date, a.end_date)}</td>
                      <td className="py-2 pr-4 text-gray-500">{a.reason ?? <span className="text-gray-300">—</span>}</td>
                      <td className="py-2 text-right">
                        <AlertDialog>
                          <AlertDialogTrigger>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminar ausencia</AlertDialogTitle>
                              <AlertDialogDescription>
                                ¿Seguro que querés eliminar esta ausencia ({formatDate(a.start_date)} – {formatDate(a.end_date)})? Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => handleDelete(a.id)}
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
