-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_professional_id()
RETURNS UUID AS $$
  SELECT professional_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT role = 'super_admin' FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin_or_above()
RETURNS BOOLEAN AS $$
  SELECT role IN ('super_admin', 'admin') FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_coordinator_or_above()
RETURNS BOOLEAN AS $$
  SELECT role IN ('super_admin', 'admin', 'coordinator') FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES POLICIES
-- ============================================================

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Super admin can view all profiles" ON profiles
  FOR SELECT USING (is_super_admin());

CREATE POLICY "Admin can view all profiles" ON profiles
  FOR SELECT USING (is_admin_or_above());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Super admin can manage all profiles" ON profiles
  FOR ALL USING (is_super_admin());

-- ============================================================
-- PROFESSIONALS POLICIES
-- ============================================================

CREATE POLICY "Authenticated users can view active professionals" ON professionals
  FOR SELECT USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

CREATE POLICY "Admin and above can manage professionals" ON professionals
  FOR ALL USING (is_admin_or_above());

CREATE POLICY "Professionals can view own record" ON professionals
  FOR SELECT USING (id = get_user_professional_id());

-- ============================================================
-- PROFESSIONAL AGREEMENTS POLICIES
-- ============================================================

CREATE POLICY "Super admin can manage agreements" ON professional_agreements
  FOR ALL USING (is_super_admin());

CREATE POLICY "Admin can view agreements" ON professional_agreements
  FOR SELECT USING (is_admin_or_above());

CREATE POLICY "Professionals can view own agreements" ON professional_agreements
  FOR SELECT USING (professional_id = get_user_professional_id());

-- ============================================================
-- PATIENTS POLICIES
-- ============================================================

CREATE POLICY "Super admin can manage all patients" ON patients
  FOR ALL USING (is_super_admin());

CREATE POLICY "Admin can manage patients" ON patients
  FOR ALL USING (is_admin_or_above());

CREATE POLICY "Coordinator can view patients" ON patients
  FOR SELECT USING (is_coordinator_or_above());

CREATE POLICY "Professionals can view assigned patients" ON patients
  FOR SELECT USING (
    deleted_at IS NULL AND (
      primary_professional_id = get_user_professional_id()
      OR id IN (
        SELECT patient_id FROM patient_professionals
        WHERE professional_id = get_user_professional_id() AND is_active = true
      )
    )
  );

-- ============================================================
-- FAMILY MEMBERS POLICIES
-- ============================================================

CREATE POLICY "Admin and above can manage family members" ON family_members
  FOR ALL USING (is_admin_or_above());

CREATE POLICY "Professionals can view family members of assigned patients" ON family_members
  FOR SELECT USING (
    patient_id IN (
      SELECT id FROM patients
      WHERE primary_professional_id = get_user_professional_id()
      OR id IN (
        SELECT patient_id FROM patient_professionals
        WHERE professional_id = get_user_professional_id() AND is_active = true
      )
    )
  );

-- ============================================================
-- APPOINTMENTS POLICIES
-- ============================================================

CREATE POLICY "Admin can manage all appointments" ON appointments
  FOR ALL USING (is_admin_or_above());

CREATE POLICY "Professionals can view own appointments" ON appointments
  FOR SELECT USING (professional_id = get_user_professional_id());

CREATE POLICY "Professionals can update own appointments" ON appointments
  FOR UPDATE USING (professional_id = get_user_professional_id());

-- ============================================================
-- CLINICAL RECORDS POLICIES (HIGH SECURITY)
-- ============================================================

CREATE POLICY "Super admin can access all clinical records" ON clinical_records
  FOR ALL USING (is_super_admin());

CREATE POLICY "Professionals can access records of assigned patients" ON clinical_records
  FOR ALL USING (
    patient_id IN (
      SELECT id FROM patients
      WHERE primary_professional_id = get_user_professional_id()
      OR id IN (
        SELECT patient_id FROM patient_professionals
        WHERE professional_id = get_user_professional_id() AND is_active = true
      )
    )
  );

-- ============================================================
-- CLINICAL NOTES POLICIES (HIGH SECURITY)
-- ============================================================

CREATE POLICY "Super admin can access all clinical notes" ON clinical_notes
  FOR ALL USING (is_super_admin());

CREATE POLICY "Professionals can access own notes" ON clinical_notes
  FOR ALL USING (professional_id = get_user_professional_id());

CREATE POLICY "Professionals can view non-confidential notes of shared patients" ON clinical_notes
  FOR SELECT USING (
    is_confidential = false AND
    clinical_record_id IN (
      SELECT id FROM clinical_records
      WHERE patient_id IN (
        SELECT patient_id FROM patient_professionals
        WHERE professional_id = get_user_professional_id() AND is_active = true
      )
    )
  );

-- ============================================================
-- PAYMENTS POLICIES
-- ============================================================

CREATE POLICY "Super admin can manage all payments" ON payments
  FOR ALL USING (is_super_admin());

CREATE POLICY "Admin can manage payments" ON payments
  FOR ALL USING (is_admin_or_above());

CREATE POLICY "Professionals can view own payments" ON payments
  FOR SELECT USING (professional_id = get_user_professional_id() AND deleted_at IS NULL);

-- ============================================================
-- DEBTS POLICIES
-- ============================================================

CREATE POLICY "Admin and above can manage debts" ON debts
  FOR ALL USING (is_admin_or_above());

CREATE POLICY "Professionals can view own debts" ON debts
  FOR SELECT USING (professional_id = get_user_professional_id());

-- ============================================================
-- SETTLEMENTS POLICIES
-- ============================================================

CREATE POLICY "Super admin can manage settlements" ON settlements
  FOR ALL USING (is_super_admin());

CREATE POLICY "Admin can view settlements" ON settlements
  FOR SELECT USING (is_admin_or_above());

CREATE POLICY "Professionals can view own settlements" ON settlements
  FOR SELECT USING (professional_id = get_user_professional_id());

-- ============================================================
-- CASH MOVEMENTS POLICIES
-- ============================================================

CREATE POLICY "Admin and above can manage cash" ON cash_movements
  FOR ALL USING (is_admin_or_above());

-- ============================================================
-- ROOMS POLICIES
-- ============================================================

CREATE POLICY "Authenticated users can view rooms" ON rooms
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can manage rooms" ON rooms
  FOR ALL USING (is_admin_or_above());

-- ============================================================
-- ADMISSIONS POLICIES
-- ============================================================

CREATE POLICY "Admin and above can manage admissions" ON admissions
  FOR ALL USING (is_admin_or_above());

CREATE POLICY "Coordinator can view admissions" ON admissions
  FOR SELECT USING (is_coordinator_or_above());

-- ============================================================
-- DOCUMENTS POLICIES
-- ============================================================

CREATE POLICY "Admin can manage all documents" ON documents
  FOR ALL USING (is_admin_or_above());

CREATE POLICY "Professionals can manage own documents" ON documents
  FOR ALL USING (professional_id = get_user_professional_id());

CREATE POLICY "Professionals can view non-clinical documents of assigned patients" ON documents
  FOR SELECT USING (
    is_clinical = false AND
    patient_id IN (
      SELECT patient_id FROM patient_professionals
      WHERE professional_id = get_user_professional_id() AND is_active = true
    )
  );

CREATE POLICY "Professionals can view clinical docs of own patients" ON documents
  FOR SELECT USING (
    patient_id IN (
      SELECT id FROM patients
      WHERE primary_professional_id = get_user_professional_id()
    )
  );

-- ============================================================
-- NOTIFICATIONS POLICIES
-- ============================================================

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admin can create notifications" ON notifications
  FOR INSERT WITH CHECK (is_admin_or_above());

-- ============================================================
-- AUDIT LOGS POLICIES
-- ============================================================

CREATE POLICY "Super admin can view all audit logs" ON audit_logs
  FOR SELECT USING (is_super_admin());

CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- TEAM MEETINGS POLICIES
-- ============================================================

CREATE POLICY "Admin can manage team meetings" ON team_meetings
  FOR ALL USING (is_admin_or_above());

CREATE POLICY "Participants can view meetings" ON team_meetings
  FOR SELECT USING (
    is_coordinator_or_above() OR
    auth.uid()::text = ANY(participants::text[])
  );

-- ============================================================
-- INTERNAL NOTES POLICIES
-- ============================================================

CREATE POLICY "Admin can view all notes" ON internal_notes
  FOR ALL USING (is_admin_or_above());

CREATE POLICY "Authors can manage own notes" ON internal_notes
  FOR ALL USING (author_id = auth.uid());

CREATE POLICY "Professionals can view non-clinical notes of patients" ON internal_notes
  FOR SELECT USING (
    is_clinical = false AND
    patient_id IN (
      SELECT patient_id FROM patient_professionals
      WHERE professional_id = get_user_professional_id() AND is_active = true
    )
  );
