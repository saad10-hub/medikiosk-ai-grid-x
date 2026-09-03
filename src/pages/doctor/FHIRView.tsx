import { useState } from 'react';
import { FileJson, Download, ArrowLeft, Info } from 'lucide-react';
import { createFHIRBundle } from '@/services/fhir';
import type { Patient, ClinicalHistory, MedicalDocument, DocumentExtraction, TimelineEvent, ClinicalSummary } from '@/types';

interface FHIRViewProps {
  patient: Patient;
  history?: ClinicalHistory | null;
  documents?: MedicalDocument[];
  extractions?: DocumentExtraction[];
  timeline?: TimelineEvent[];
  summary?: ClinicalSummary | null;
  onBack: () => void;
}

export function FHIRView({ patient, history, documents, extractions, timeline, summary, onBack }: FHIRViewProps) {
  const [showRaw, setShowRaw] = useState(false);

  const bundle = createFHIRBundle(patient, history, documents, extractions, timeline, summary);
  const jsonStr = JSON.stringify(bundle, null, 2);
  const resourceCount = bundle.entry.length;

  function handleDownload() {
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fhir_bundle_${patient.full_name.replace(/\s/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const resourceTypes = bundle.entry.reduce<Record<string, number>>((acc, e) => {
    const type = e.resource.resourceType as string;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="btn-ghost">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-xl font-bold text-neutral-900">ABDM/FHIR Integration</h1>
        </div>
        <button onClick={handleDownload} className="btn-secondary text-sm">
          <Download className="w-4 h-4" />
          Export JSON
        </button>
      </div>

      <div className="card p-4 mb-4 bg-secondary-50 border-secondary-200">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-secondary-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-neutral-800">ABDM/FHIR Integration — Future/Prototype Interface</p>
            <p className="text-xs text-neutral-600 mt-1">
              This is a prototype interface for future Ayushman Bharat Digital Mission (ABDM) / FHIR R4 compatibility.
              The data below is mapped to FHIR resources but is not connected to any live ABDM endpoint.
            </p>
          </div>
        </div>
      </div>

      <div className="card p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <FileJson className="w-5 h-5 text-primary-600" />
          <h2 className="section-title">FHIR Bundle Overview</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-neutral-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-neutral-900">{resourceCount}</p>
            <p className="text-xs text-neutral-500">Total Resources</p>
          </div>
          {Object.entries(resourceTypes).map(([type, count]) => (
            <div key={type} className="bg-neutral-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-primary-600">{count as number}</p>
              <p className="text-xs text-neutral-500">{type}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowRaw(false)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!showRaw ? 'bg-primary-50 text-primary-700' : 'text-neutral-500 hover:bg-neutral-100'}`}
          >
            Summary View
          </button>
          <button
            onClick={() => setShowRaw(true)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${showRaw ? 'bg-primary-50 text-primary-700' : 'text-neutral-500 hover:bg-neutral-100'}`}
          >
            Raw JSON
          </button>
        </div>
      </div>

      {!showRaw ? (
        <div className="space-y-3">
          {bundle.entry.map((entry, i) => {
            const res = entry.resource as Record<string, unknown>;
            const rt = res.resourceType as string;
            return (
            <div key={i} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="badge-info">{rt}</span>
                {res.id ? <span className="text-xs text-neutral-400">ID: {String(res.id)}</span> : null}
              </div>
              <div className="text-sm text-neutral-600">
                {rt === 'Patient' && (
                  <span>Patient: {((res as { name?: { family: string }[] }).name)?.[0]?.family}</span>
                )}
                {rt === 'Condition' && (
                  <span>Condition: {(res as { code?: { text: string } }).code?.text}</span>
                )}
                {rt === 'MedicationStatement' && (
                  <span>Medication: {(res as { medicationCodeableConcept?: { text: string } }).medicationCodeableConcept?.text}</span>
                )}
                {rt === 'Observation' && (
                  <span>Observation: {(res as { code?: { text: string } }).code?.text}</span>
                )}
                {rt === 'DocumentReference' && (
                  <span>Document: {((res as { content?: { attachment?: { title: string } }[] }).content)?.[0]?.attachment?.title}</span>
                )}
                {rt === 'Encounter' && <span>Encounter record</span>}
              </div>
            </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-4">
          <pre className="text-xs text-neutral-700 overflow-x-auto scrollbar-thin font-mono whitespace-pre-wrap">{jsonStr}</pre>
        </div>
      )}
    </div>
  );
}
