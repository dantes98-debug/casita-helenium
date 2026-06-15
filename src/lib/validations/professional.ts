import { z } from 'zod'

export const professionalSchema = z.object({
  first_name: z.string().min(1, 'Nombre requerido'),
  last_name: z.string().min(1, 'Apellido requerido'),
  dni: z.string().optional(),
  cuit: z.string().optional(),
  profession: z.string().min(1, 'Profesión requerida'),
  specialty: z.string().optional(),
  license_number: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  join_date: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  type: z.enum(['internal', 'external', 'mixed', 'workshop', 'room_rental']),
  area: z.string().optional(),
  availability_notes: z.string().optional(),
  observations: z.string().optional(),
})

export const agreementSchema = z.object({
  type: z.enum(['hourly_rental', 'monthly_rental', 'session_percentage', 'fixed_fee', 'mixed', 'fixed_blocks', 'custom']),
  session_value: z.coerce.number().optional(),
  center_percentage: z.coerce.number().min(0).max(100).optional(),
  professional_percentage: z.coerce.number().min(0).max(100).optional(),
  room_hourly_value: z.coerce.number().optional(),
  monthly_value: z.coerce.number().optional(),
  fixed_fee: z.coerce.number().optional(),
  start_date: z.string().min(1, 'Fecha de inicio requerida'),
  end_date: z.string().optional(),
  observations: z.string().optional(),
})

export type ProfessionalFormData = z.infer<typeof professionalSchema>
export type AgreementFormData = z.infer<typeof agreementSchema>
