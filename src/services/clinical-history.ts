import { supabase, getEdgeFunctionUrl, getAuthHeaders } from './supabase';
import type {
  AIHistoryRequest,
  AIHistoryResponse,
  ConversationMessage,
  HistorySection,
  StructuredClinicalData,
  RedFlag,
  ClinicalSummaryData,
} from '@/types';

export async function callAIClinical(request: AIHistoryRequest): Promise<AIHistoryResponse> {
  const url = getEdgeFunctionUrl('ai-clinical');
  const headers = getAuthHeaders();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('The AI service took too long to respond. Please try again.');
    }
    throw new Error('Could not connect to the AI service. Please check your connection and try again.');
  }
  clearTimeout(timeout);

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `AI service error (${response.status})`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorMessage;
    } catch {
      // not json
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data as AIHistoryResponse;
}

export async function askNextQuestion(
  clinicalHistoryId: string,
  patientId: string,
  conversationHistory: ConversationMessage[],
  currentSection: HistorySection,
  patientAnswer: string,
  existingRedFlags: RedFlag[],
  language: string = 'en',
  patientData: Record<string, string> = {}
): Promise<{ 
  question: string | null; 
  section: HistorySection; 
  isSectionComplete: boolean; 
  isComplete: boolean;
  nextSection: string | null;
  redFlags: RedFlag[]; 
  updatedPatientData: Record<string, string>;
  missingInformation: string[];
}> {
  const response = await callAIClinical({
    action: 'ask_question',
    patient_id: patientId,
    clinical_history_id: clinicalHistoryId,
    conversation_history: conversationHistory,
    current_section: currentSection,
    patient_answer: patientAnswer,
    existing_red_flags: existingRedFlags,
    language: language as AIHistoryRequest['language'],
    patient_data: patientData,
  });

  const message = (response as { message?: string }).message || response.question || null;
  const isComplete = (response as { is_complete?: boolean }).is_complete || false;
  const nextSection = (response as { next_section?: string }).next_section || null;
  const updatedPatientData = (response as { updated_patient_data?: Record<string, string> }).updated_patient_data || patientData;
  const missingInformation = (response as { missing_information?: string[] }).missing_information || [];

  return {
    question: message,
    section: (response.section as HistorySection) || currentSection,
    isSectionComplete: response.is_section_complete || false,
    isComplete,
    nextSection,
    redFlags: response.red_flags || [],
    updatedPatientData,
    missingInformation,
  };
}

export async function structureHistory(
  clinicalHistoryId: string,
  patientId: string,
  conversationHistory: ConversationMessage[],
  patientData: Record<string, string> = {}
): Promise<StructuredClinicalData> {
  const response = await callAIClinical({
    action: 'structure_history',
    patient_id: patientId,
    clinical_history_id: clinicalHistoryId,
    conversation_history: conversationHistory,
    patient_data: patientData,
  });
  return response.structured_data || {};
}

export async function generateSummary(
  patientId: string,
  clinicalHistoryId: string,
  structuredData: Partial<StructuredClinicalData>,
  documentFindings: string,
  timelineEvents: unknown[]
): Promise<{ summary: ClinicalSummaryData; summaryId: string | null }> {
  const response = await callAIClinical({
    action: 'generate_summary',
    patient_id: patientId,
    clinical_history_id: clinicalHistoryId,
    structured_data: structuredData,
    document_findings: documentFindings,
    timeline_events: timelineEvents,
  });
  return {
    summary: response.summary as ClinicalSummaryData,
    summaryId: (response as { summary_id?: string }).summary_id || null,
  };
}

// ============================================================
// Predefined red flag patterns for client-side detection
// ============================================================
export const RED_FLAG_PATTERNS: { patterns: string[]; type: string; description: string; severity: 'high' | 'critical' }[] = [
  { patterns: ['severe chest pain', 'crushing chest pain', 'chest pain with sweating', 'chest hurting since', 'chest has been hurting'], type: 'severe_chest_pain', description: 'Severe chest pain — possible cardiac emergency', severity: 'critical' },
  { patterns: ['chest pain and breathing', 'chest pain with breathless', 'short of breath', 'difficulty breathing', 'breathing difficulty', "can't breathe", 'breathless'], type: 'severe_breathing', description: 'Breathing difficulty — requires immediate attention', severity: 'critical' },
  { patterns: ['one side weakness', 'sudden weakness', 'facial droop'], type: 'sudden_weakness', description: 'Sudden weakness on one side — possible stroke', severity: 'critical' },
  { patterns: ['difficulty speaking', 'slurred speech', "can't speak"], type: 'speech_difficulty', description: 'Sudden difficulty speaking — possible stroke', severity: 'critical' },
  { patterns: ['loss of consciousness', 'fainted', 'unconscious'], type: 'loss_of_consciousness', description: 'Loss of consciousness', severity: 'critical' },
  { patterns: ['severe breathing difficulty', "can't breathe", 'breathless'], type: 'severe_breathing', description: 'Severe breathing difficulty', severity: 'critical' },
  { patterns: ['uncontrolled bleeding', 'severe bleeding'], type: 'severe_bleeding', description: 'Severe uncontrolled bleeding', severity: 'critical' },
  { patterns: ['severe allergic reaction', 'anaphylaxis', 'swelling of face'], type: 'severe_allergy', description: 'Severe allergic reaction', severity: 'critical' },
];

export function detectRedFlagsClient(text: string): RedFlag[] {
  const lower = text.toLowerCase();
  const detected: RedFlag[] = [];
  for (const flag of RED_FLAG_PATTERNS) {
    for (const pattern of flag.patterns) {
      if (lower.includes(pattern)) {
        if (!detected.find((d) => d.type === flag.type)) {
          detected.push({ type: flag.type, description: flag.description, severity: flag.severity });
        }
        break;
      }
    }
  }
  return detected;
}

// ============================================================
// Database operations for clinical histories
// ============================================================
export async function createClinicalHistory(patientId: string, chiefComplaint: string): Promise<string> {
  const { data, error } = await supabase
    .from('clinical_histories')
    .insert({
      patient_id: patientId,
      chief_complaint: chiefComplaint,
      current_section: 'chief_complaint',
      status: 'in_progress',
      conversation_history: [],
      structured_data: {},
      red_flags_detected: [],
      missing_information: [],
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function getClinicalHistory(patientId: string) {
  const { data, error } = await supabase
    .from('clinical_histories')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getClinicalHistoryById(id: string) {
  const { data, error } = await supabase
    .from('clinical_histories')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getClinicalSummary(patientId: string) {
  const { data, error } = await supabase
    .from('clinical_summaries')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateClinicalSummary(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('clinical_summaries')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function getRedFlagAlerts() {
  const { data, error } = await supabase
    .from('red_flag_alerts')
    .select('*, patients(full_name, age, gender)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getRedFlagAlertsForPatient(patientId: string) {
  const { data, error } = await supabase
    .from('red_flag_alerts')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function acknowledgeRedFlag(id: string, doctorId: string) {
  const { data, error } = await supabase
    .from('red_flag_alerts')
    .update({
      acknowledged: true,
      acknowledged_by: doctorId,
      acknowledged_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
