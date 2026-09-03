import { useState, useEffect } from 'react';
import { Logo } from '@/components/Logo';
import { FileText, ArrowLeft, ArrowRight, Loader, AlertTriangle, Info } from 'lucide-react';
import { generateSummary } from '@/services/clinical-history';
import { getAllExtractions, getTimelineEvents } from '@/services/documents';
import { updatePatient } from '@/services/patients';
import { toast } from '@/hooks/useToast';
import type { StructuredClinicalData, ClinicalSummaryData, DocumentExtraction, TimelineEvent } from '@/types';

interface SummaryPageProps {
  patientId: string;
  clinicalHistoryId: string;
  structuredData: StructuredClinicalData;
  onComplete: (summary: ClinicalSummaryData, summaryId: string | null) => void;
  onBack: () => void;
}

export function SummaryPage({ patientId, clinicalHistoryId, structuredData, onComplete, onBack }: SummaryPageProps) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ClinicalSummaryData | null>(null);
  const [summaryId, setSummaryId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function generate() {
      try {
        // Get document extractions for findings
        const extractions: DocumentExtraction[] = await getAllExtractions(patientId);
        const timeline: TimelineEvent[] = await getTimelineEvents(patientId);

        // Build document findings text
        let docFindings = '';
        if (extractions.length > 0) {
          const findings: string[] = [];
          for (const ext of extractions) {
            if (ext.extracted_diagnoses?.length > 0) {
              findings.push(`Diagnoses: ${ext.extracted_diagnoses.map((d) => d.name).join(', ')}`);
            }
            if (ext.extracted_medications?.length > 0) {
              findings.push(`Medications: ${ext.extracted_medications.map((m) => `${m.name} ${m.dosage || ''}`.trim()).join(', ')}`);
            }
            if (ext.extracted_investigations?.length > 0) {
              findings.push(`Investigations: ${ext.extracted_investigations.map((i) => `${i.test_name}: ${i.value || ''} ${i.unit || ''}`.trim()).join(', ')}`);
            }
            if (ext.abnormal_values?.length > 0) {
              findings.push(`Abnormal values: ${ext.abnormal_values.map((a) => `${a.test_name}: ${a.value}`).join(', ')}`);
            }
          }
          docFindings = findings.join('\n');
        }

        const result = await generateSummary(
          patientId,
          clinicalHistoryId,
          structuredData,
          docFindings,
          timeline
        );
        setSummary(result.summary);
        setSummaryId(result.summaryId);

        // Update patient status
        await updatePatient(patientId, { status: 'completed' });

        setLoading(false);
      } catch (err) {
        console.error(err);
        setError(true);
        setLoading(false);
        toast('error', 'Could not generate clinical summary. Please try again.');
      }
    }
    generate();
  }, [patientId, clinicalHistoryId, structuredData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <header className="px-6 py-5"><Logo size="md" /></header>
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <Loader className="w-10 h-10 text-primary-600 animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-neutral-700">Generating your clinical summary...</h2>
            <p className="text-sm text-neutral-500 mt-1">AI is organizing your information for your doctor</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <header className="px-6 py-5"><Logo size="md" /></header>
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-md text-center">
            <AlertTriangle className="w-10 h-10 text-error-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-neutral-700 mb-2">Could not generate summary</h2>
            <p className="text-sm text-neutral-500 mb-4">There was a problem generating the AI summary. You can still proceed with the information collected.</p>
            <button onClick={() => onComplete({} as ClinicalSummaryData, null)} className="btn-primary">Continue anyway</button>
          </div>
        </main>
      </div>
    );
  }

  const summarySections = [
    { label: 'Chief Complaint', value: summary.chief_complaint },
    { label: 'History of Present Illness', value: summary.history_of_present_illness },
    { label: 'Past Medical History', value: summary.past_medical_history },
    { label: 'Past Surgical History', value: summary.past_surgical_history },
    { label: 'Drug History', value: summary.drug_history },
    { label: 'Allergy History', value: summary.allergy_history },
    { label: 'Family History', value: summary.family_history },
    { label: 'Personal History', value: summary.personal_history },
    { label: 'Review of Systems', value: summary.review_of_systems },
    { label: 'Previous Investigations', value: summary.previous_investigations },
    { label: 'Current Medications', value: summary.current_medications },
    { label: 'Important Document Findings', value: summary.important_document_findings },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between">
        <Logo size="md" />
      </header>

      <main className="flex-1 flex items-start justify-center px-6 py-8 overflow-y-auto">
        <div className="max-w-3xl w-full">
          <div className="text-center mb-6 animate-fade-in">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 mb-3">
              <FileText className="w-7 h-7 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-1">AI Clinical Summary</h1>
            <p className="text-sm text-neutral-500">Physician-ready summary generated from your history</p>
          </div>

          {/* AI disclaimer */}
          <div className="card p-4 mb-4 bg-warning-50 border-warning-200 animate-slide-up">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-warning-600 shrink-0 mt-0.5" />
              <p className="text-sm text-neutral-700">
                <strong>AI-generated draft — physician verification required.</strong> This summary is for clinical documentation support and must be reviewed by a qualified healthcare professional.
              </p>
            </div>
          </div>

          {/* Red flags */}
          {summary.red_flags && summary.red_flags.length > 0 && (
            <div className="card p-4 mb-4 bg-error-50 border-error-200 animate-slide-up">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-error-600" />
                <h3 className="text-sm font-semibold text-error-700">Red Flag Alerts</h3>
              </div>
              <ul className="space-y-1">
                {summary.red_flags.map((flag, i) => (
                  <li key={i} className="text-sm text-error-700">• {flag.description || flag.type}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Summary sections */}
          <div className="card p-6 mb-4 animate-slide-up">
            <div className="space-y-4">
              {summarySections.map((section) => (
                section.value && (
                  <div key={section.label}>
                    <h3 className="text-sm font-semibold text-neutral-900 mb-1">{section.label}</h3>
                    <p className="text-sm text-neutral-600 whitespace-pre-wrap">{section.value}</p>
                  </div>
                )
              ))}
            </div>
          </div>

          {/* Missing information */}
          {summary.missing_information && summary.missing_information.length > 0 && (
            <div className="card p-4 mb-4 bg-secondary-50 border-secondary-200">
              <h3 className="text-sm font-semibold text-secondary-700 mb-2">Missing Information</h3>
              <ul className="space-y-1">
                {summary.missing_information.map((info, i) => (
                  <li key={i} className="text-sm text-neutral-600">• {info}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={onBack} className="btn-ghost">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button onClick={() => onComplete(summary, summaryId)} className="btn-primary">
              Continue to Review
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
