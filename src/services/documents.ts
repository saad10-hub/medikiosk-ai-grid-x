import { supabase, STORAGE_BUCKET, getEdgeFunctionUrl, getAuthHeaders } from './supabase';
import type {
  MedicalDocument,
  DocumentExtraction,
  TimelineEvent,
  DocumentType,
  ProcessingStatus,
} from '@/types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

export async function uploadDocument(
  file: File,
  patientId: string,
  documentType: DocumentType
): Promise<MedicalDocument> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds 10MB limit');
  }

  if (file.type && !ALLOWED_TYPES.includes(file.type.toLowerCase())) {
    throw new Error('Only PDF, JPG, and PNG files are supported');
  }

  const fileExt = file.name.split('.').pop() || 'file';
  const fileName = `${patientId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('medical_documents')
    .insert({
      patient_id: patientId,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      storage_path: fileName,
      document_type: documentType,
      processing_status: 'uploaded',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as MedicalDocument;
}

export async function getDocuments(patientId: string): Promise<MedicalDocument[]> {
  const { data, error } = await supabase
    .from('medical_documents')
    .select('*')
    .eq('patient_id', patientId)
    .order('uploaded_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getDocumentExtraction(documentId: string): Promise<DocumentExtraction | null> {
  const { data, error } = await supabase
    .from('document_extractions')
    .select('*')
    .eq('document_id', documentId)
    .maybeSingle();

  if (error) throw error;
  return data as DocumentExtraction | null;
}

export async function getAllExtractions(patientId: string): Promise<DocumentExtraction[]> {
  const { data, error } = await supabase
    .from('document_extractions')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getDocumentDownloadUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 3600);

  if (error) throw error;
  return data.signedUrl;
}

export async function processDocument(
  documentId: string,
  patientId: string,
  fileName: string
): Promise<{ raw_text?: string; structured_data?: unknown; abnormal_values?: unknown[]; error?: string }> {
  const url = getEdgeFunctionUrl('ocr-extraction');
  const headers = getAuthHeaders();

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      document_id: documentId,
      patient_id: patientId,
      file_name: fileName,
    }),
  });

  if (!response.ok) {
    let errorMessage = `OCR service error (${response.status})`;
    try {
      const errorJson = await response.json();
      errorMessage = errorJson.error || errorMessage;
    } catch {
      // not json
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  if (data.error && !data.raw_text) {
    throw new Error(data.error);
  }
  return data;
}

export async function updateDocumentStatus(documentId: string, status: ProcessingStatus) {
  const { error } = await supabase
    .from('medical_documents')
    .update({ processing_status: status })
    .eq('id', documentId);

  if (error) throw error;
}

export async function deleteDocument(documentId: string, storagePath: string) {
  const { error: storageError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([storagePath]);

  if (storageError) throw storageError;

  const { error } = await supabase
    .from('medical_documents')
    .delete()
    .eq('id', documentId);

  if (error) throw error;
}

// ============================================================
// Timeline operations
// ============================================================
export async function getTimelineEvents(patientId: string): Promise<TimelineEvent[]> {
  const { data, error } = await supabase
    .from('clinical_timeline')
    .select('*')
    .eq('patient_id', patientId)
    .order('event_date', { ascending: false, nullsFirst: false });

  if (error) throw error;
  return data || [];
}

export async function addTimelineEvent(event: Omit<TimelineEvent, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('clinical_timeline')
    .insert(event)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTimelineEvent(id: string) {
  const { error } = await supabase
    .from('clinical_timeline')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
