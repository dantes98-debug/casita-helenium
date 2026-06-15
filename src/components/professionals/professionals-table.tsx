'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Professional, ProfessionalAgreement } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Eye, Edit, Trash2, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type ProfessionalWithAgreements = Professional & {
  professional_agreements: ProfessionalAgreement[]
}

const typeLabels: Record<string, string> = {
  internal: 'Interno', external: 'Externo', mixed: 'Mixto',
  workshop: 'Tallerista', room_rental: 'Alquiler consultorio',
}
const typeColors: Record<string, string> = {
  internal: 'bg-teal-100 text-teal-700', external: 'bg-blue-100 text-blue-700',
  mixed: 'bg-purple-100 text-purple-700', workshop: 'bg-orange-100 text-orange-700',
  room_rental: 'bg-gray-100 text-gray-600',
}

export function ProfessionalsTable({ professionals }: { professionals: ProfessionalWithAgreements[] }) {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const router = useRouter()

  const filtered = professionals.filter(p => {
    const matchSearch = `${p.first_name} ${p.last_name} ${p.profession} ${p.specialty ?? ''}`.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || p.type === filterType
    const matchStatus = filterStatus === 'all' || p.status === filterStatus
    return matchSearch && matchType && matchStatus
  })

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar a ${name}? Esta acción es irreversible.`)) return
    const supabase = createClient()
    const { error } = await supabase.from('professionals').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Profesional eliminado')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Buscar por nombre, profesión..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="internal">Interno</SelectItem>
            <SelectItem value="external">Externo</SelectItem>
            <SelectItem value="mixed">Mixto</SelectItem>
            <SelectItem value="workshop">Tallerista</SelectItem>
            <SelectItem value="room_rental">Alquiler consultorio</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Profesión</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Área</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Acuerdo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No se encontraron profesionales</td></tr>
                ) : filtered.map(p => {
                  const activeAgreement = p.professional_agreements?.find(a => a.status === 'active')
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{p.last_name}, {p.first_name}</td>
                      <td className="px-4 py-3 text-gray-600">{p.profession}{p.specialty ? ` · ${p.specialty}` : ''}</td>
                      <td className="px-4 py-3">
                        <Badge className={typeColors[p.type]}>{typeLabels[p.type]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{p.area ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {activeAgreement ? (
                          activeAgreement.type === 'session_percentage'
                            ? `${activeAgreement.professional_percentage}% prof / ${activeAgreement.center_percentage}% centro`
                            : activeAgreement.type === 'hourly_rental'
                            ? `$${activeAgreement.room_hourly_value}/h alquiler`
                            : activeAgreement.type
                        ) : <span className="text-red-400">Sin acuerdo</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                          {p.status === 'active' ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/professionals/${p.id}`}><Eye className="h-4 w-4" /></Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/professionals/${p.id}/edit`}><Edit className="h-4 w-4" /></Link>
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id, `${p.first_name} ${p.last_name}`)}>
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <p className="text-xs text-gray-400">{filtered.length} de {professionals.length} profesionales</p>
    </div>
  )
}
