-- ============================================================
-- La Casita Helenium - Schema Completo
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'professional', 'coordinator', 'family');
CREATE TYPE professional_type AS ENUM ('internal', 'external', 'mixed', 'workshop', 'room_rental');
CREATE TYPE professional_status AS ENUM ('active', 'inactive');
CREATE TYPE agreement_type AS ENUM ('hourly_rental', 'monthly_rental', 'session_percentage', 'fixed_fee', 'mixed', 'fixed_blocks', 'custom');
CREATE TYPE patient_status AS ENUM ('active', 'paused', 'discharged', 'inactive', 'waiting_list', 'referred');
CREATE TYPE appointment_status AS ENUM ('reserved', 'confirmed', 'pending_confirmation', 'completed', 'cancelled_with_notice', 'cancelled_without_notice', 'absent', 'rescheduled');
CREATE TYPE payment_status AS ENUM ('paid', 'pending', 'overdue', 'partial', 'discounted', 'cancelled');
CREATE TYPE payment_method AS ENUM ('cash', 'transfer', 'mercadopago', 'debit', 'credit', 'other');
CREATE TYPE room_status AS ENUM ('available', 'occupied', 'maintenance', 'inactive');
CREATE TYPE settlement_status AS ENUM ('pending', 'generated', 'paid', 'disputed');
CREATE TYPE admission_status AS ENUM ('inquiry_received', 'pending_response', 'interview_scheduled', 'in_evaluation', 'waiting_list', 'assigned', 'in_treatment', 'did_not_enter', 'externally_referred');
CREATE TYPE clinical_note_type AS ENUM ('evolution', 'report', 'certificate', 'consent', 'referral', 'other');
CREATE TYPE cash_movement_type AS ENUM ('income', 'expense');
CREATE TYPE debt_status AS ENUM ('active', 'partially_paid', 'paid', 'written_off');

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'admin',
  professional_id UUID,
  avatar_url TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROFESSIONALS
-- ============================================================

CREATE TABLE professionals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dni TEXT,
  cuit TEXT,
  profession TEXT NOT NULL,
  specialty TEXT,
  license_number TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  join_date DATE,
  status professional_status NOT NULL DEFAULT 'active',
  type professional_type NOT NULL DEFAULT 'internal',
  area TEXT,
  availability_notes TEXT,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Add FK after profiles table exists
ALTER TABLE profiles ADD CONSTRAINT profiles_professional_id_fkey
  FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE SET NULL;

-- ============================================================
-- PROFESSIONAL AGREEMENTS
-- ============================================================

CREATE TABLE professional_agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  type agreement_type NOT NULL,
  session_value DECIMAL(10,2),
  center_percentage DECIMAL(5,2),
  professional_percentage DECIMAL(5,2),
  room_hourly_value DECIMAL(10,2),
  monthly_value DECIMAL(10,2),
  fixed_fee DECIMAL(10,2),
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PATIENTS
-- ============================================================

CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dni TEXT,
  birth_date DATE,
  phone TEXT,
  email TEXT,
  address TEXT,
  health_insurance TEXT,
  health_insurance_number TEXT,
  diagnosis TEXT,
  reason_for_consultation TEXT,
  primary_professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
  status patient_status NOT NULL DEFAULT 'active',
  referral_source TEXT,
  admission_date DATE,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================
-- FAMILY MEMBERS / RESPONSIBLES
-- ============================================================

CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  dni TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  is_legal_guardian BOOLEAN NOT NULL DEFAULT false,
  is_payment_responsible BOOLEAN NOT NULL DEFAULT false,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PATIENT <-> PROFESSIONAL ASSIGNMENTS
-- ============================================================

CREATE TABLE patient_professionals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  role TEXT,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(patient_id, professional_id)
);

-- ============================================================
-- ROOMS / CONSULTORIOS
-- ============================================================

CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'consultorio',
  capacity INTEGER,
  description TEXT,
  status room_status NOT NULL DEFAULT 'available',
  hourly_rate DECIMAL(10,2),
  monthly_rate DECIMAL(10,2),
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- APPOINTMENTS / TURNOS
-- ============================================================

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status appointment_status NOT NULL DEFAULT 'reserved',
  payment_status payment_status NOT NULL DEFAULT 'pending',
  payment_method payment_method,
  value DECIMAL(10,2),
  admin_notes TEXT,
  clinical_notes TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_pattern TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_overlap_professional EXCLUDE USING gist (
    professional_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (status NOT IN ('cancelled_with_notice', 'cancelled_without_notice', 'rescheduled'))
);

-- ============================================================
-- CLINICAL RECORDS
-- ============================================================

CREATE TABLE clinical_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  admission_interview TEXT,
  reason_for_consultation TEXT,
  background TEXT,
  presumptive_diagnosis TEXT,
  confirmed_diagnosis TEXT,
  therapeutic_objectives TEXT,
  treatment_plan TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'paused')),
  closure_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CLINICAL NOTES / EVOLUCIONES
-- ============================================================

CREATE TABLE clinical_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinical_record_id UUID NOT NULL REFERENCES clinical_records(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  note_type clinical_note_type NOT NULL DEFAULT 'evolution',
  date DATE NOT NULL,
  attendance BOOLEAN NOT NULL DEFAULT true,
  session_type TEXT,
  interventions TEXT,
  clinical_observations TEXT,
  next_objectives TEXT,
  is_confidential BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  concept TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method payment_method NOT NULL,
  status payment_status NOT NULL DEFAULT 'paid',
  date DATE NOT NULL,
  receipt_number TEXT,
  cash_destination TEXT,
  registered_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================
-- DEBTS
-- ============================================================

CREATE TABLE debts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
  concept TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE,
  status debt_status NOT NULL DEFAULT 'active',
  last_reminder_date DATE,
  claim_status TEXT,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SETTLEMENTS / LIQUIDACIONES
-- ============================================================

CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  sessions_completed INTEGER NOT NULL DEFAULT 0,
  sessions_paid INTEGER NOT NULL DEFAULT 0,
  sessions_pending INTEGER NOT NULL DEFAULT 0,
  total_billed DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_collected DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_pending DECIMAL(10,2) NOT NULL DEFAULT 0,
  center_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  professional_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  room_rental DECIMAL(10,2) NOT NULL DEFAULT 0,
  manual_adjustments DECIMAL(10,2) NOT NULL DEFAULT 0,
  bonuses DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_to_pay DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_owed_to_center DECIMAL(10,2) NOT NULL DEFAULT 0,
  net_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  status settlement_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CASH MOVEMENTS / CAJA
-- ============================================================

CREATE TABLE cash_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type cash_movement_type NOT NULL,
  concept TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method payment_method NOT NULL DEFAULT 'cash',
  date DATE NOT NULL,
  category TEXT,
  reference_id UUID,
  registered_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ADMISSIONS / ADMISIONES
-- ============================================================

CREATE TABLE admissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_date DATE NOT NULL,
  patient_first_name TEXT NOT NULL,
  patient_last_name TEXT,
  responsible_name TEXT,
  phone TEXT NOT NULL,
  reason_for_consultation TEXT,
  referral_source TEXT,
  suggested_professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
  status admission_status NOT NULL DEFAULT 'inquiry_received',
  next_action TEXT,
  observations TEXT,
  assigned_patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TEAM MEETINGS
-- ============================================================

CREATE TABLE team_meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  description TEXT,
  objectives TEXT,
  agreements TEXT,
  participants UUID[],
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INTERNAL NOTES
-- ============================================================

CREATE TABLE internal_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_clinical BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DOCUMENTS
-- ============================================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  is_clinical BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_professionals_status ON professionals(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_professionals_type ON professionals(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_patients_status ON patients(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_patients_professional ON patients(primary_professional_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_appointments_start_time ON appointments(start_time);
CREATE INDEX idx_appointments_professional ON appointments(professional_id);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_payments_date ON payments(date) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_patient ON payments(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_professional ON payments(professional_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_debts_status ON debts(status);
CREATE INDEX idx_debts_patient ON debts(patient_id);
CREATE INDEX idx_settlements_professional ON settlements(professional_id);
CREATE INDEX idx_settlements_period ON settlements(period_start, period_end);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_clinical_notes_record ON clinical_notes(clinical_record_id);
CREATE INDEX idx_clinical_notes_professional ON clinical_notes(professional_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, read);
CREATE INDEX idx_cash_movements_date ON cash_movements(date);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_professionals_updated_at BEFORE UPDATE ON professionals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settlements_updated_at BEFORE UPDATE ON settlements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clinical_records_updated_at BEFORE UPDATE ON clinical_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clinical_notes_updated_at BEFORE UPDATE ON clinical_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_debts_updated_at BEFORE UPDATE ON debts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admissions_updated_at BEFORE UPDATE ON admissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_professional_agreements_updated_at BEFORE UPDATE ON professional_agreements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'admin')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- AUDIT LOG TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  audit_user_id UUID;
BEGIN
  -- Try to get current user from auth context
  audit_user_id := auth.uid();

  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values)
    VALUES (audit_user_id, 'DELETE', TG_TABLE_NAME, OLD.id::TEXT, to_jsonb(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (audit_user_id, 'UPDATE', TG_TABLE_NAME, NEW.id::TEXT, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (audit_user_id, 'INSERT', TG_TABLE_NAME, NEW.id::TEXT, to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE OR DELETE ON payments FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_clinical_records AFTER INSERT OR UPDATE OR DELETE ON clinical_records FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_clinical_notes AFTER INSERT OR UPDATE OR DELETE ON clinical_notes FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_settlements AFTER INSERT OR UPDATE OR DELETE ON settlements FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_professional_agreements AFTER INSERT OR UPDATE OR DELETE ON professional_agreements FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_profiles AFTER INSERT OR UPDATE OR DELETE ON profiles FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
