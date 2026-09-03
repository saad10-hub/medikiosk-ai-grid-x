import { supabase } from './supabase';
import type { Patient, Consent, AuditLog } from '@/types';

export async function createPatient(data: {
  full_name: string;
  date_of_birth?: string;
  age?: number;
  gender?: string;
  phone_number?: string;
  preferred_language?: string;
  abha_id?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  blood_group?: string;
  history_mode?: string;
}): Promise<Patient> {
  const { data: patient, error } = await supabase
    .from('patients')
    .insert({
      full_name: data.full_name,
      date_of_birth: data.date_of_birth || null,
      age: data.age || null,
      gender: data.gender || null,
      phone_number: data.phone_number || null,
      preferred_language: data.preferred_language || 'en',
      abha_id: data.abha_id || null,
      address: data.address || null,
      emergency_contact_name: data.emergency_contact_name || null,
      emergency_contact_phone: data.emergency_contact_phone || null,
      blood_group: data.blood_group || null,
      history_mode: data.history_mode || 'allopathic',
      status: 'registered',
      priority: 'normal',
    })
    .select('*')
    .single();

  if (error) throw error;
  return patient as Patient;
}

export async function getPatient(id: string): Promise<Patient | null> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as Patient | null;
}

export async function updatePatient(id: string, updates: Partial<Patient>): Promise<Patient> {
  const { data, error } = await supabase
    .from('patients')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as Patient;
}

export async function getAllPatients(): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Patient[];
}

export async function getPatientsForDoctor(doctorId: string): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('assigned_doctor_id', doctorId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Patient[];
}

export async function getPatientsToday(): Promise<Patient[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Patient[];
}

export async function getUrgentPatients(): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .in('priority', ['high', 'urgent'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Patient[];
}

// ============================================================
// Consent operations
// ============================================================
export async function recordConsent(patientId: string, consentGiven: boolean, consentText: string): Promise<Consent> {
  const { data, error } = await supabase
    .from('consents')
    .insert({
      patient_id: patientId,
      consent_given: consentGiven,
      consent_text: consentText,
      consent_version: '1.0',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as Consent;
}

export async function getConsent(patientId: string): Promise<Consent | null> {
  const { data, error } = await supabase
    .from('consents')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .maybeSingle();

  if (error) throw error;
  return data as Consent | null;
}

// ============================================================
// Audit log operations
// ============================================================
export async function logAudit(entry: {
  actor_type: 'patient' | 'doctor' | 'admin' | 'system' | 'ai';
  action: string;
  entity_type?: string;
  entity_id?: string;
  patient_id?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      actor_type: entry.actor_type,
      action: entry.action,
      entity_type: entry.entity_type || null,
      entity_id: entry.entity_id || null,
      patient_id: entry.patient_id || null,
      details: entry.details || {},
    });
  } catch (err) {
    console.error('Failed to log audit entry:', err);
  }
}

export async function getAuditLogs(limit = 50): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as AuditLog[];
}

// ============================================================
// Doctor review operations
// ============================================================
export async function createDoctorReview(data: {
  patient_id: string;
  doctor_id: string;
  clinical_summary_id?: string;
  review_status?: string;
  doctor_notes?: string;
}) {
  const { data: review, error } = await supabase
    .from('doctor_reviews')
    .insert({
      patient_id: data.patient_id,
      doctor_id: data.doctor_id,
      clinical_summary_id: data.clinical_summary_id || null,
      review_status: data.review_status || 'pending',
      doctor_notes: data.doctor_notes || null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return review;
}

export async function updateDoctorReview(id: string, updates: {
  review_status?: string;
  doctor_notes?: string;
  edited_summary?: Record<string, unknown>;
  reviewed_at?: string;
}) {
  const { data, error } = await supabase
    .from('doctor_reviews')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function getDoctorReview(patientId: string) {
  const { data, error } = await supabase
    .from('doctor_reviews')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .maybeSingle();

  if (error) throw error;
  return data;
}
