import { ProfessionalForm } from '@/components/professionals/professional-form'

export default function NewProfessionalPage() {
  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nuevo profesional</h1>
        <p className="text-gray-500 text-sm">Completá los datos del nuevo profesional</p>
      </div>
      <ProfessionalForm />
    </div>
  )
}
