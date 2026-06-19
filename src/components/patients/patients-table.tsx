'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Patient } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Eye, Edit, Search, Download, FileText } from 'lucide-react'
import { differenceInYears } from 'date-fns'
import * as XLSX from 'xlsx'

type PatientWithProfessional = Patient & {
  primary_professional?: { first_name: string; last_name: string; profession: string } | null
}

const statusLabels: Record<string, string> = {
  active: 'Activo', paused: 'En pausa', discharged: 'Alta',
  inactive: 'Inactivo', waiting_list: 'Lista de espera', referred: 'Derivado',
}
const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700', paused: 'bg-yellow-100 text-yellow-700',
  discharged: 'bg-blue-100 text-blue-700', inactive: 'bg-gray-100 text-gray-500',
  waiting_list: 'bg-orange-100 text-orange-700', referred: 'bg-purple-100 text-purple-700',
}

const PAGE_SIZE = 20

export function PatientsTable({ patients, hideProfessionalColumn }: { patients: PatientWithProfessional[]; hideProfessionalColumn?: boolean }) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [search, filterStatus])

  function handleExport() {
    const data = filtered.map(p => ({
      Apellido: p.last_name,
      Nombre: p.first_name,
      DNI: p.dni ?? '',
      'Fecha nacimiento': p.birth_date ?? '',
      Teléfono: p.phone ?? '',
      Email: p.email ?? '',
      Estado: statusLabels[p.status] ?? p.status,
      Profesional: p.primary_professional
        ? `${p.primary_professional.last_name}, ${p.primary_professional.first_name}`
        : '',
      Ingreso: p.created_at ? p.created_at.split('T')[0] : '',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Pacientes')
    XLSX.writeFile(wb, `pacientes_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const filtered = patients.filter(p => {
    const matchSearch = `${p.first_name} ${p.last_name} ${p.dni ?? ''} ${p.health_insurance ?? ''}`.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || p.status === filterStatus
    return matchSearch && matchStatus
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Buscar por nombre, DNI, obra social..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}>
          <Download className="h-4 w-4 mr-2" />Exportar
        </Button>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
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
                  <th className="text-left px-4 py-3 font-medium text-gray-600">DNI</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Edad</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Obra social</th>
                  {!hideProfessionalColumn && <th className="text-left px-4 py-3 font-medium text-gray-600">Profesional</th>}
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr><td colSpan={hideProfessionalColumn ? 6 : 7} className="px-4 py-8 text-center text-gray-400">No se encontraron pacientes</td></tr>
                ) : paginated.map(p => {
                  const age = p.birth_date ? differenceInYears(new Date(), new Date(p.birth_date)) : null
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        <Link href={`/patients/${p.id}`} className="hover:text-teal-600 hover:underline">
                          {p.last_name}, {p.first_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{p.dni ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{age !== null ? `${age} años` : '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{p.health_insurance ?? '—'}</td>
                      {!hideProfessionalColumn && (
                        <td className="px-4 py-3 text-gray-500">
                          {p.primary_professional
                            ? `${p.primary_professional.last_name}, ${p.primary_professional.first_name}`
                            : '—'}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <Badge className={statusColors[p.status]}>{statusLabels[p.status]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" asChild title="Historia clínica">
                            <Link href={`/patients/${p.id}/clinical-record`}><FileText className="h-4 w-4" /></Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild title="Ver paciente">
                            <Link href={`/patients/${p.id}`}><Eye className="h-4 w-4" /></Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild title="Editar">
                            <Link href={`/patients/${p.id}/edit`}><Edit className="h-4 w-4" /></Link>
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
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">{filtered.length} de {patients.length} pacientes</p>
        {totalPages > 1 && (
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Anterior
            </Button>
            <span className="text-sm text-gray-600">Página {page} de {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Siguiente
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
