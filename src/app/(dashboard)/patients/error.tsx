'use client'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function PatientsError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error('[Patients]', error) }, [error])
  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
      <AlertTriangle className="h-10 w-10 text-amber-400" />
      <h2 className="text-lg font-semibold text-gray-800">No se pudo cargar la lista de pacientes</h2>
      <p className="text-sm text-gray-500 max-w-sm">Ocurrió un error al obtener los datos. Intentá de nuevo.</p>
      <Button onClick={reset} className="bg-teal-600 hover:bg-teal-700">Reintentar</Button>
    </div>
  )
}
