// ============================================================
// MediKiosk - Core Type Definitions
// ============================================================

export type UserRole = 'patient' | 'doctor' | 'admin';

export type PatientPriority = 'normal' | 'high' | 'urgent';

export type PatientStatus =
  | 'registered'
  | 'in_progress'
  | 'completed'
  | 'reviewed'
  | 'consulted';

export type HistoryMode = 'allopathic' | 'ayush';

export type Language = 'en' | 'ta' | 'hi';

export interface Patient {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  age: number | null;
  gender: string | null;
  phone_number: string | null;
  preferred_language: Language;
  abha_id: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  blood_group: string | null;
  assigned_doctor_id: string | null;
  priority: PatientPriority;
  status: PatientStatus;
  history_mode: HistoryMode;
  created_at: string;
  updated_at: string;
}

export interface Consent {
  id: string;
  patient_id: string;
  consent_given: boolean;
  consent_text: string | null;
  consent_version: string;
  created_at: string;
}

export type ClinicalHistoryStatus = 'in_progress' | 'completed' | 'structured';

export type HistorySection =
  | 'chief_complaint'
  | 'history_of_present_illness'
  | 'past_medical_history'
  | 'past_surgical_history'
  | 'drug_history'
  | 'allergy_history'
  | 'family_history'
  | 'personal_history'
  | 'review_of_systems';

export interface ConversationMessage {
  role: 'assistant' | 'user' | 'system';
  content: string;
  section?: HistorySection;
  timestamp?: string;
}

export interface ClinicalHistory {
  id: string;
  patient_id: string;
  chief_complaint: string | null;
  structured_data: StructuredClinicalData;
  current_section: string;
  current_question: string | null;
  conversation_history: ConversationMessage[];
  status: ClinicalHistoryStatus;
  red_flags_detected: RedFlag[];
  missing_information: string[];
  created_at: string;
  updated_at: string;
}

export interface HistoryAnswer {
  id: string;
  clinical_history_id: string;
  patient_id: string;
  section: string;
  question: string;
  answer: string | null;
  question_role: string;
  created_at: string;
}

export interface StructuredClinicalData {
  chief_complaint?: string;
  history_of_present_illness?: string;
  past_medical_history?: string;
  past_surgical_history?: string;
  drug_history?: string;
  allergy_history?: string;
  family_history?: string;
  personal_history?: string;
  review_of_systems?: string;
  red_flags?: string[];
  missing_information?: string[];
}

export type DocumentType =
  | 'prescription'
  | 'blood_report'
  | 'lab_report'
  | 'discharge_summary'
  | 'scan_report'
  | 'medical_certificate'
  | 'other';

export type ProcessingStatus =
  | 'uploaded'
  | 'processing'
  | 'processed'
  | 'needs_review'
  | 'failed';

export interface MedicalDocument {
  id: string;
  patient_id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string;
  document_type: DocumentType | null;
  processing_status: ProcessingStatus;
  uploaded_at: string;
  processed_at: string | null;
}

export interface ExtractedMedication {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
}

export interface ExtractedInvestigation {
  test_name: string;
  value?: string;
  unit?: string;
  reference_range?: string;
  is_abnormal?: boolean;
  date?: string;
}

export interface ExtractedDiagnosis {
  name: string;
  date?: string;
  icd_code?: string;
}

export interface DocumentExtraction {
  id: string;
  document_id: string;
  patient_id: string;
  raw_text: string | null;
  structured_data: Record<string, unknown>;
  extracted_diagnoses: ExtractedDiagnosis[];
  extracted_medications: ExtractedMedication[];
  extracted_investigations: ExtractedInvestigation[];
  extracted_procedures: { name: string; date?: string }[];
  extracted_dates: { event: string; date: string }[];
  abnormal_values: ExtractedInvestigation[];
  confidence_score: number | null;
  processing_notes: string | null;
  created_at: string;
}

export type TimelineEventType =
  | 'diagnosis'
  | 'surgery'
  | 'hospitalization'
  | 'investigation'
  | 'prescription'
  | 'consultation'
  | 'vaccination'
  | 'other';

export interface TimelineEvent {
  id: string;
  patient_id: string;
  event_date: string | null;
  event_type: TimelineEventType;
  event_title: string;
  event_description: string | null;
  source: 'patient' | 'document' | 'ai_generated';
  source_document_id: string | null;
  source_history_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ClinicalSummary {
  id: string;
  patient_id: string;
  clinical_history_id: string | null;
  summary_data: Record<string, unknown>;
  chief_complaint: string | null;
  history_of_present_illness: string | null;
  past_medical_history: string | null;
  past_surgical_history: string | null;
  drug_history: string | null;
  allergy_history: string | null;
  family_history: string | null;
  personal_history: string | null;
  review_of_systems: string | null;
  previous_investigations: string | null;
  current_medications: string | null;
  important_document_findings: string | null;
  red_flags: RedFlag[];
  missing_information: string[];
  is_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface RedFlag {
  type: string;
  description: string;
  severity: 'medium' | 'high' | 'critical';
}

export interface RedFlagAlert {
  id: string;
  patient_id: string;
  clinical_history_id: string | null;
  flag_type: string;
  flag_description: string;
  severity: 'medium' | 'high' | 'critical';
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

export interface DoctorReview {
  id: string;
  patient_id: string;
  doctor_id: string;
  clinical_summary_id: string | null;
  review_status: 'pending' | 'reviewed' | 'confirmed' | 'edited';
  doctor_notes: string | null;
  edited_summary: Record<string, unknown> | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_type: 'patient' | 'doctor' | 'admin' | 'system' | 'ai';
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  patient_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'doctor' | 'admin';
  department: string | null;
  created_at: string;
  updated_at: string;
}

// AI Service types
export interface AIHistoryRequest {
  action: 'ask_question' | 'structure_history' | 'generate_summary';
  patient_id: string;
  clinical_history_id: string;
  conversation_history?: ConversationMessage[];
  current_section?: HistorySection;
  patient_answer?: string;
  structured_data?: Partial<StructuredClinicalData>;
  chief_complaint?: string;
  language?: Language;
  existing_red_flags?: RedFlag[];
  document_findings?: string;
  timeline_events?: unknown[];
  patient_data?: Record<string, string>;
}

export interface AIHistoryResponse {
  question?: string;
  message?: string;
  section?: HistorySection;
  is_section_complete?: boolean;
  is_complete?: boolean;
  next_section?: string | null;
  used_fallback?: boolean;
  structured_data?: StructuredClinicalData;
  red_flags?: RedFlag[];
  missing_information?: string[];
  summary?: ClinicalSummaryData;
  summary_id?: string;
  error?: string;
}

export interface ClinicalSummaryData {
  chief_complaint: string;
  history_of_present_illness: string;
  past_medical_history: string;
  past_surgical_history: string;
  drug_history: string;
  allergy_history: string;
  family_history: string;
  personal_history: string;
  review_of_systems: string;
  previous_investigations: string;
  current_medications: string;
  important_document_findings: string;
  red_flags: RedFlag[];
  missing_information: string[];
}

export interface OCRExtractionRequest {
  document_id: string;
  patient_id: string;
  file_name: string;
  text_content?: string;
}

export interface OCRExtractionResponse {
  raw_text?: string;
  structured_data?: {
    diagnoses: ExtractedDiagnosis[];
    medications: ExtractedMedication[];
    investigations: ExtractedInvestigation[];
    procedures: { name: string; date?: string }[];
    dates: { event: string; date: string }[];
  };
  abnormal_values?: ExtractedInvestigation[];
  confidence_score?: number;
  error?: string;
}

// AYUSH extension types
export interface AYUSHData {
  prakriti?: string;
  vikriti?: string;
  agni?: string;
  koshtha?: string;
  ahara?: string;
  vihara?: string;
  nidana?: string;
  dashavidha_pariksha?: {
    dooshya?: string;
    desha?: string;
    kala?: string;
    prana?: string;
    vikriti_samkhya?: string;
    vikriti_prakriti?: string;
    sara?: string;
    samhanana?: string;
    pramana?: string;
    satmya?: string;
    sattva?: string;
  };
}

// FHIR mapping types (future interface)
export interface FHIRResource {
  resourceType: string;
  id?: string;
}

export interface FHIRPatient extends FHIRResource {
  resourceType: 'Patient';
  name?: { family: string; given?: string[] }[];
  birthDate?: string;
  gender?: string;
  telecom?: { system: string; value: string }[];
  address?: { text: string }[];
}

export interface FHIRCondition extends FHIRResource {
  resourceType: 'Condition';
  subject?: { reference: string };
  code?: { text: string };
  onsetDateTime?: string;
}
