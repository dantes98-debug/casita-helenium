export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'super_admin' | 'admin' | 'professional' | 'coordinator' | 'family'

export type ProfessionalType = 'internal' | 'external' | 'mixed' | 'workshop' | 'room_rental'

export type AppointmentStatus =
  | 'reserved'
  | 'confirmed'
  | 'pending_confirmation'
  | 'completed'
  | 'cancelled_with_notice'
  | 'cancelled_without_notice'
  | 'absent'
  | 'rescheduled'

export type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'partial' | 'discounted' | 'cancelled'

export type PaymentMethod = 'cash' | 'transfer' | 'mercadopago' | 'debit' | 'credit' | 'other'

export type PatientStatus = 'active' | 'paused' | 'discharged' | 'inactive' | 'waiting_list' | 'referred'

export type AgreementType =
  | 'hourly_rental'
  | 'monthly_rental'
  | 'session_percentage'
  | 'fixed_fee'
  | 'mixed'
  | 'fixed_blocks'
  | 'custom'

export type AdmissionStatus =
  | 'inquiry_received'
  | 'pending_response'
  | 'interview_scheduled'
  | 'in_evaluation'
  | 'waiting_list'
  | 'assigned'
  | 'in_treatment'
  | 'did_not_enter'
  | 'externally_referred'

export type SettlementStatus = 'pending' | 'generated' | 'paid' | 'disputed'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  professional_id?: string
  avatar_url?: string
  phone?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Professional {
  id: string
  first_name: string
  last_name: string
  dni: string
  cuit?: string
  profession: string
  specialty?: string
  license_number?: string
  phone?: string
  email?: string
  address?: string
  join_date?: string
  status: 'active' | 'inactive'
  type: ProfessionalType
  area?: string
  availability_notes?: string
  observations?: string
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface ProfessionalAgreement {
  id: string
  professional_id: string
  type: AgreementType
  session_value?: number
  center_percentage?: number
  professional_percentage?: number
  room_hourly_value?: number
  monthly_value?: number
  fixed_fee?: number
  start_date: string
  end_date?: string
  status: 'active' | 'inactive'
  observations?: string
  created_at: string
  updated_at: string
}

export interface Patient {
  id: string
  first_name: string
  last_name: string
  dni?: string
  birth_date?: string
  phone?: string
  email?: string
  address?: string
  health_insurance?: string
  health_insurance_number?: string
  diagnosis?: string
  reason_for_consultation?: string
  primary_professional_id?: string
  status: PatientStatus
  referral_source?: string
  admission_date?: string
  observations?: string
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface FamilyMember {
  id: string
  patient_id: string
  first_name: string
  last_name: string
  relationship: string
  dni?: string
  phone?: string
  email?: string
  address?: string
  is_legal_guardian: boolean
  is_payment_responsible: boolean
  observations?: string
  created_at: string
  updated_at: string
}

export interface Room {
  id: string
  name: string
  type: string
  capacity?: number
  description?: string
  status: 'available' | 'occupied' | 'maintenance' | 'inactive'
  hourly_rate?: number
  monthly_rate?: number
  observations?: string
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  patient_id: string
  professional_id: string
  room_id?: string
  start_time: string
  end_time: string
  status: AppointmentStatus
  payment_status: PaymentStatus
  payment_method?: PaymentMethod
  value?: number
  admin_notes?: string
  clinical_notes?: string
  is_recurring: boolean
  recurrence_pattern?: string
  created_by: string
  created_at: string
  updated_at: string
  patient?: Patient
  professional?: Professional
  room?: Room
}

export interface ClinicalRecord {
  id: string
  patient_id: string
  created_by: string
  admission_interview?: string
  reason_for_consultation?: string
  background?: string
  presumptive_diagnosis?: string
  confirmed_diagnosis?: string
  therapeutic_objectives?: string
  treatment_plan?: string
  status: 'active' | 'closed' | 'paused'
  closure_notes?: string
  created_at: string
  updated_at: string
}

export interface ClinicalNote {
  id: string
  clinical_record_id: string
  appointment_id?: string
  professional_id: string
  note_type: 'evolution' | 'report' | 'certificate' | 'consent' | 'referral' | 'other'
  date: string
  attendance: boolean
  session_type?: string
  interventions?: string
  clinical_observations?: string
  next_objectives?: string
  is_confidential: boolean
  created_at: string
  updated_at: string
  professional?: Professional
}

export interface Payment {
  id: string
  patient_id?: string
  professional_id?: string
  appointment_id?: string
  concept: string
  amount: number
  payment_method: PaymentMethod
  status: PaymentStatus
  date: string
  receipt_number?: string
  cash_destination?: string
  registered_by: string
  observations?: string
  created_at: string
  updated_at: string
  patient?: Patient
  professional?: Professional
}

export interface Debt {
  id: string
  patient_id?: string
  professional_id?: string
  concept: string
  amount: number
  due_date?: string
  status: 'active' | 'partially_paid' | 'paid' | 'written_off'
  last_reminder_date?: string
  claim_status?: string
  observations?: string
  created_at: string
  updated_at: string
  patient?: Patient
  professional?: Professional
}

export interface Settlement {
  id: string
  professional_id: string
  period_start: string
  period_end: string
  sessions_completed: number
  sessions_paid: number
  sessions_pending: number
  total_billed: number
  total_collected: number
  total_pending: number
  center_amount: number
  professional_amount: number
  room_rental: number
  manual_adjustments: number
  bonuses: number
  total_to_pay: number
  total_owed_to_center: number
  net_total: number
  status: SettlementStatus
  paid_at?: string
  observations?: string
  created_at: string
  updated_at: string
  professional?: Professional
}

export interface CashMovement {
  id: string
  type: 'income' | 'expense'
  concept: string
  amount: number
  payment_method: PaymentMethod
  date: string
  category?: string
  reference_id?: string
  registered_by: string
  observations?: string
  created_at: string
  updated_at: string
}

export interface Admission {
  id: string
  contact_date: string
  patient_first_name: string
  patient_last_name?: string
  responsible_name?: string
  phone: string
  reason_for_consultation?: string
  referral_source?: string
  suggested_professional_id?: string
  status: AdmissionStatus
  next_action?: string
  observations?: string
  assigned_patient_id?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  name: string
  type: string
  patient_id?: string
  professional_id?: string
  uploaded_by: string
  storage_path: string
  file_size?: number
  mime_type?: string
  is_clinical: boolean
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  read: boolean
  link?: string
  created_at: string
}

export interface AuditLog {
  id: string
  user_id?: string
  action: string
  table_name: string
  record_id?: string
  old_values?: Json
  new_values?: Json
  ip_address?: string
  created_at: string
  user?: Profile
}

export interface DashboardKPIs {
  activePatients: number
  newPatientsThisMonth: number
  dischargedPatients: number
  waitingListPatients: number
  todayAppointments: number
  weekAppointments: number
  monthAppointments: number
  attendanceRate: number
  dailyRevenue: number
  monthlyRevenue: number
  totalPending: number
  totalDebt: number
  collectionRate: number
  roomOccupancy: number
}
