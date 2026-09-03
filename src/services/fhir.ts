import type { Patient, ClinicalHistory, MedicalDocument, DocumentExtraction, TimelineEvent, ClinicalSummary } from '@/types';

export interface FHIRBundle {
  resourceType: 'Bundle';
  type: 'collection';
  entry: { resource: Record<string, unknown> }[];
}

export function mapPatientToFHIR(patient: Patient): Record<string, unknown> {
  return {
    resourceType: 'Patient',
    id: patient.id,
    name: [{ family: patient.full_name }],
    birthDate: patient.date_of_birth || undefined,
    gender: patient.gender || undefined,
    telecom: patient.phone_number ? [{ system: 'phone', value: patient.phone_number }] : [],
    address: patient.address ? [{ text: patient.address }] : [],
    identifier: patient.abha_id ? [{ system: 'https://abdm.gov.in/abha', value: patient.abha_id }] : [],
    extension: [
      {
        url: 'https://medikiosk.in/fhir/StructureDefinition/preferred-language',
        valueString: patient.preferred_language,
      },
    ],
  };
}

export function mapConditionToFHIR(patientId: string, diagnosis: { name: string; date?: string }): Record<string, unknown> {
  return {
    resourceType: 'Condition',
    subject: { reference: `Patient/${patientId}` },
    code: { text: diagnosis.name },
    onsetDateTime: diagnosis.date || undefined,
  };
}

export function mapMedicationToFHIR(patientId: string, medication: { name: string; dosage?: string; frequency?: string }): Record<string, unknown> {
  return {
    resourceType: 'MedicationStatement',
    subject: { reference: `Patient/${patientId}` },
    medicationCodeableConcept: { text: medication.name },
    dosage: [{
      text: [medication.dosage, medication.frequency].filter(Boolean).join(' ') || undefined,
    }],
  };
}

export function mapObservationToFHIR(patientId: string, investigation: { test_name: string; value?: string; unit?: string; reference_range?: string; date?: string }): Record<string, unknown> {
  return {
    resourceType: 'Observation',
    subject: { reference: `Patient/${patientId}` },
    code: { text: investigation.test_name },
    valueQuantity: investigation.value ? {
      value: parseFloat(investigation.value) || investigation.value,
      unit: investigation.unit || undefined,
    } : undefined,
    referenceRange: investigation.reference_range ? [{ text: investigation.reference_range }] : [],
    effectiveDateTime: investigation.date || undefined,
  };
}

export function mapDocumentToFHIR(patientId: string, doc: MedicalDocument): Record<string, unknown> {
  return {
    resourceType: 'DocumentReference',
    subject: { reference: `Patient/${patientId}` },
    type: { text: doc.document_type || 'medical-document' },
    status: 'current',
    indexed: doc.uploaded_at,
    content: [{
      attachment: {
        contentType: doc.file_type || undefined,
        title: doc.file_name,
      },
    }],
  };
}

export function mapEncounterToFHIR(patientId: string, patient: Patient): Record<string, unknown> {
  return {
    resourceType: 'Encounter',
    status: 'finished',
    subject: { reference: `Patient/${patientId}` },
    class: { code: 'ambulatory', display: 'ambulatory' },
    priority: patient.priority === 'urgent' ? { code: 'urgent' } : undefined,
  };
}

export function createFHIRBundle(
  patient: Patient,
  history?: ClinicalHistory | null,
  documents?: MedicalDocument[],
  extractions?: DocumentExtraction[],
  timeline?: TimelineEvent[],
  summary?: ClinicalSummary | null
): FHIRBundle {
  const entries: { resource: Record<string, unknown> }[] = [];

  entries.push({ resource: mapPatientToFHIR(patient) });
  entries.push({ resource: mapEncounterToFHIR(patient.id, patient) });

  if (extractions) {
    for (const ext of extractions) {
      for (const diag of ext.extracted_diagnoses || []) {
        entries.push({ resource: mapConditionToFHIR(patient.id, diag) });
      }
      for (const med of ext.extracted_medications || []) {
        entries.push({ resource: mapMedicationToFHIR(patient.id, med) });
      }
      for (const inv of ext.extracted_investigations || []) {
        entries.push({ resource: mapObservationToFHIR(patient.id, inv) });
      }
    }
  }

  if (documents) {
    for (const doc of documents) {
      entries.push({ resource: mapDocumentToFHIR(patient.id, doc) });
    }
  }

  if (timeline) {
    for (const event of timeline) {
      if (event.event_type === 'diagnosis') {
        entries.push({ resource: mapConditionToFHIR(patient.id, { name: event.event_title, date: event.event_date || undefined }) });
      }
    }
  }

  return {
    resourceType: 'Bundle',
    type: 'collection',
    entry: entries,
  };
}
