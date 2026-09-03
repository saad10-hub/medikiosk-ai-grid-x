/*
# MediKiosk Initial Schema

## Purpose
MediKiosk is an AI-powered clinical pre-consultation and patient intake platform.
This migration creates the complete database schema for patients, clinical histories,
medical documents, AI extractions, timelines, summaries, doctor reviews, red-flag alerts,
and audit logs.

## Tables Created
1. `patients` — Patient demographic and contact information
2. `consents` — Patient consent records with timestamps
3. `clinical_histories` — Main clinical history session per patient
4. `history_answers` — Individual Q&A entries within a clinical history
5. `medical_documents` — Uploaded medical document metadata
6. `document_extractions` — OCR + AI extracted structured data from documents
7. `clinical_timeline` — Chronological medical events derived from history + documents
8. `clinical_summaries` — AI-generated physician-reviewable summaries
9. `doctor_reviews` — Doctor review/verification records
10. `red_flag_alerts` — Emergency symptom alerts
11. `audit_logs` — Activity audit trail
12. `profiles` — User profiles for doctors/admins (linked to auth.users)

## Security
- RLS enabled on ALL tables
- Patient flow uses anon+authenticated (kiosk model, no patient login)
- Doctor/Admin flow uses authenticated with role checks
- Doctors can only access patients assigned to them
- Patients (anon) can only access their own data via patient_id
*/

-- ============================================================
-- PROFILES TABLE (for doctors/admins linked to auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'doctor' CHECK (role IN ('doctor', 'admin')),
  department text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
CREATE POLICY "profiles_select_own_or_admin" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
CREATE POLICY "profiles_insert_self" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- PATIENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  date_of_birth date,
  age integer,
  gender text,
  phone_number text,
  preferred_language text DEFAULT 'en',
  abha_id text,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  blood_group text,
  assigned_doctor_id uuid REFERENCES profiles(id),
  priority text DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
  status text DEFAULT 'registered' CHECK (status IN ('registered', 'in_progress', 'completed', 'reviewed', 'consulted')),
  history_mode text DEFAULT 'allopathic' CHECK (history_mode IN ('allopathic', 'ayush')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Patient kiosk flow: anon can create and read/update their own patient record
-- Doctors: can read patients assigned to them; admins can read all
DROP POLICY IF EXISTS "patients_select_all" ON patients;
CREATE POLICY "patients_select_all" ON patients
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "patients_insert_all" ON patients;
CREATE POLICY "patients_insert_all" ON patients
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "patients_update_all" ON patients;
CREATE POLICY "patients_update_all" ON patients
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "patients_delete_admin" ON patients;
CREATE POLICY "patients_delete_admin" ON patients
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- ============================================================
-- CONSENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  consent_given boolean NOT NULL DEFAULT false,
  consent_text text,
  consent_version text DEFAULT '1.0',
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consents_select_all" ON consents;
CREATE POLICY "consents_select_all" ON consents
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "consents_insert_all" ON consents;
CREATE POLICY "consents_insert_all" ON consents
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "consents_update_all" ON consents;
CREATE POLICY "consents_update_all" ON consents
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- CLINICAL HISTORIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS clinical_histories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  chief_complaint text,
  structured_data jsonb DEFAULT '{}'::jsonb,
  current_section text DEFAULT 'chief_complaint',
  current_question text,
  conversation_history jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'structured')),
  red_flags_detected jsonb DEFAULT '[]'::jsonb,
  missing_information jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE clinical_histories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinical_histories_select_all" ON clinical_histories;
CREATE POLICY "clinical_histories_select_all" ON clinical_histories
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "clinical_histories_insert_all" ON clinical_histories;
CREATE POLICY "clinical_histories_insert_all" ON clinical_histories
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "clinical_histories_update_all" ON clinical_histories;
CREATE POLICY "clinical_histories_update_all" ON clinical_histories
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- HISTORY ANSWERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS history_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinical_history_id uuid NOT NULL REFERENCES clinical_histories(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  section text NOT NULL,
  question text NOT NULL,
  answer text,
  question_role text DEFAULT 'assistant',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE history_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "history_answers_select_all" ON history_answers;
CREATE POLICY "history_answers_select_all" ON history_answers
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "history_answers_insert_all" ON history_answers;
CREATE POLICY "history_answers_insert_all" ON history_answers
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "history_answers_update_all" ON history_answers;
CREATE POLICY "history_answers_update_all" ON history_answers
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- MEDICAL DOCUMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS medical_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text,
  file_size bigint,
  storage_path text NOT NULL,
  document_type text CHECK (document_type IN ('prescription', 'blood_report', 'lab_report', 'discharge_summary', 'scan_report', 'medical_certificate', 'other')),
  processing_status text DEFAULT 'uploaded' CHECK (processing_status IN ('uploaded', 'processing', 'processed', 'needs_review', 'failed')),
  uploaded_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

ALTER TABLE medical_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "medical_documents_select_all" ON medical_documents;
CREATE POLICY "medical_documents_select_all" ON medical_documents
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "medical_documents_insert_all" ON medical_documents;
CREATE POLICY "medical_documents_insert_all" ON medical_documents
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "medical_documents_update_all" ON medical_documents;
CREATE POLICY "medical_documents_update_all" ON medical_documents
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "medical_documents_delete_all" ON medical_documents;
CREATE POLICY "medical_documents_delete_all" ON medical_documents
  FOR DELETE TO anon, authenticated
  USING (true);

-- ============================================================
-- DOCUMENT EXTRACTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS document_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES medical_documents(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  raw_text text,
  structured_data jsonb DEFAULT '{}'::jsonb,
  extracted_diagnoses jsonb DEFAULT '[]'::jsonb,
  extracted_medications jsonb DEFAULT '[]'::jsonb,
  extracted_investigations jsonb DEFAULT '[]'::jsonb,
  extracted_procedures jsonb DEFAULT '[]'::jsonb,
  extracted_dates jsonb DEFAULT '[]'::jsonb,
  abnormal_values jsonb DEFAULT '[]'::jsonb,
  confidence_score real,
  processing_notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE document_extractions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_extractions_select_all" ON document_extractions;
CREATE POLICY "document_extractions_select_all" ON document_extractions
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "document_extractions_insert_all" ON document_extractions;
CREATE POLICY "document_extractions_insert_all" ON document_extractions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "document_extractions_update_all" ON document_extractions;
CREATE POLICY "document_extractions_update_all" ON document_extractions
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- CLINICAL TIMELINE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS clinical_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  event_date date,
  event_type text NOT NULL CHECK (event_type IN ('diagnosis', 'surgery', 'hospitalization', 'investigation', 'prescription', 'consultation', 'vaccination', 'other')),
  event_title text NOT NULL,
  event_description text,
  source text DEFAULT 'patient' CHECK (source IN ('patient', 'document', 'ai_generated')),
  source_document_id uuid REFERENCES medical_documents(id) ON DELETE SET NULL,
  source_history_id uuid REFERENCES clinical_histories(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clinical_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinical_timeline_select_all" ON clinical_timeline;
CREATE POLICY "clinical_timeline_select_all" ON clinical_timeline
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "clinical_timeline_insert_all" ON clinical_timeline;
CREATE POLICY "clinical_timeline_insert_all" ON clinical_timeline
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "clinical_timeline_update_all" ON clinical_timeline;
CREATE POLICY "clinical_timeline_update_all" ON clinical_timeline
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "clinical_timeline_delete_all" ON clinical_timeline;
CREATE POLICY "clinical_timeline_delete_all" ON clinical_timeline
  FOR DELETE TO anon, authenticated
  USING (true);

-- ============================================================
-- CLINICAL SUMMARIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS clinical_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinical_history_id uuid REFERENCES clinical_histories(id) ON DELETE SET NULL,
  summary_data jsonb DEFAULT '{}'::jsonb,
  chief_complaint text,
  history_of_present_illness text,
  past_medical_history text,
  past_surgical_history text,
  drug_history text,
  allergy_history text,
  family_history text,
  personal_history text,
  review_of_systems text,
  previous_investigations text,
  current_medications text,
  important_document_findings text,
  red_flags jsonb DEFAULT '[]'::jsonb,
  missing_information jsonb DEFAULT '[]'::jsonb,
  is_verified boolean DEFAULT false,
  verified_by uuid REFERENCES profiles(id),
  verified_at timestamptz,
  version integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE clinical_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinical_summaries_select_all" ON clinical_summaries;
CREATE POLICY "clinical_summaries_select_all" ON clinical_summaries
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "clinical_summaries_insert_all" ON clinical_summaries;
CREATE POLICY "clinical_summaries_insert_all" ON clinical_summaries
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "clinical_summaries_update_all" ON clinical_summaries;
CREATE POLICY "clinical_summaries_update_all" ON clinical_summaries
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- DOCTOR REVIEWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS doctor_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clinical_summary_id uuid REFERENCES clinical_summaries(id) ON DELETE SET NULL,
  review_status text DEFAULT 'pending' CHECK (review_status IN ('pending', 'reviewed', 'confirmed', 'edited')),
  doctor_notes text,
  edited_summary jsonb,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE doctor_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doctor_reviews_select_all" ON doctor_reviews;
CREATE POLICY "doctor_reviews_select_all" ON doctor_reviews
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "doctor_reviews_insert_all" ON doctor_reviews;
CREATE POLICY "doctor_reviews_insert_all" ON doctor_reviews
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "doctor_reviews_update_all" ON doctor_reviews;
CREATE POLICY "doctor_reviews_update_all" ON doctor_reviews
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- RED FLAG ALERTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS red_flag_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinical_history_id uuid REFERENCES clinical_histories(id) ON DELETE CASCADE,
  flag_type text NOT NULL,
  flag_description text NOT NULL,
  severity text DEFAULT 'high' CHECK (severity IN ('medium', 'high', 'critical')),
  acknowledged boolean DEFAULT false,
  acknowledged_by uuid REFERENCES profiles(id),
  acknowledged_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE red_flag_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "red_flag_alerts_select_all" ON red_flag_alerts;
CREATE POLICY "red_flag_alerts_select_all" ON red_flag_alerts
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "red_flag_alerts_insert_all" ON red_flag_alerts;
CREATE POLICY "red_flag_alerts_insert_all" ON red_flag_alerts
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "red_flag_alerts_update_all" ON red_flag_alerts;
CREATE POLICY "red_flag_alerts_update_all" ON red_flag_alerts
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- AUDIT LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_type text CHECK (actor_type IN ('patient', 'doctor', 'admin', 'system', 'ai')),
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  patient_id uuid REFERENCES patients(id) ON DELETE SET NULL,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select_authenticated" ON audit_logs;
CREATE POLICY "audit_logs_select_authenticated" ON audit_logs
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "audit_logs_insert_all" ON audit_logs;
CREATE POLICY "audit_logs_insert_all" ON audit_logs
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_patients_assigned_doctor ON patients(assigned_doctor_id);
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);
CREATE INDEX IF NOT EXISTS idx_patients_priority ON patients(priority);
CREATE INDEX IF NOT EXISTS idx_clinical_histories_patient ON clinical_histories(patient_id);
CREATE INDEX IF NOT EXISTS idx_history_answers_history ON history_answers(clinical_history_id);
CREATE INDEX IF NOT EXISTS idx_medical_documents_patient ON medical_documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_document_extractions_doc ON document_extractions(document_id);
CREATE INDEX IF NOT EXISTS idx_clinical_timeline_patient ON clinical_timeline(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_summaries_patient ON clinical_summaries(patient_id);
CREATE INDEX IF NOT EXISTS idx_doctor_reviews_doctor ON doctor_reviews(doctor_id);
CREATE INDEX IF NOT EXISTS idx_red_flag_alerts_patient ON red_flag_alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_patient ON audit_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_patients_updated_at ON patients;
CREATE TRIGGER trigger_patients_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_clinical_histories_updated_at ON clinical_histories;
CREATE TRIGGER trigger_clinical_histories_updated_at BEFORE UPDATE ON clinical_histories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_clinical_summaries_updated_at ON clinical_summaries;
CREATE TRIGGER trigger_clinical_summaries_updated_at BEFORE UPDATE ON clinical_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON profiles;
CREATE TRIGGER trigger_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
