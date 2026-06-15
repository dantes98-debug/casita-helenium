import { z } from 'zod'

export const patientSchema = z.object({
  first_name: z.string().min(1, 'Nombre requerido'),
  last_name: z.string().min(1, 'Apellido requerido'),
  dni: z.string().optional(),
  birth_date: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  health_insurance: z.string().optional(),
  health_insurance_number: z.string().optional(),
  diagnosis: z.string().optional(),
  reason_for_consultation: z.string().optional(),
  primary_professional_id: z.string().uuid().optional().or(z.literal('')),
  status: z.enum(['active', 'paused', 'discharged', 'inactive', 'waiting_list', 'referred']).default('active'),
  referral_source: z.string().optional(),
  admission_date: z.string().optional(),
  observations: z.string().optional(),
  patient_source: z.enum(['center', 'professional']).default('professional'),
  school: z.string().optional(),
  school_grade: z.string().optional(),
  school_shift: z.enum(['morning', 'afternoon', 'full_day']).optional().or(z.literal('')),
})

export const familyMemberSchema = z.object({
  first_name: z.string().min(1, 'Nombre requerido'),
  last_name: z.string().min(1, 'Apellido requerido'),
  relationship: z.string().min(1, 'Vínculo requerido'),
  dni: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  is_legal_guardian: z.boolean().default(false),
  is_payment_responsible: z.boolean().default(false),
  observations: z.string().optional(),
})

export type PatientFormData = z.infer<typeof patientSchema>
export type FamilyMemberFormData = z.infer<typeof familyMemberSchema>
