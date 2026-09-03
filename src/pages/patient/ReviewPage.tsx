import { useState, useEffect } from 'react';
import { Logo } from '@/components/Logo';
import { CheckCircle2, ArrowLeft, ArrowRight, User, FileText, FileCheck, AlertTriangle, CheckCheck } from 'lucide-react';
import { getPatient } from '@/services/patients';
import { getDocuments } from '@/services/documents';
import { getTimelineEvents } from '@/services/documents';
import { updatePatient, logAudit } from '@/services/patients';
import { toast } from '@/hooks/useToast';
import type { Patient, MedicalDocument, TimelineEvent, ClinicalSummaryData } from '@/types';

interface ReviewPageProps {
  patientId: string;
  summary: ClinicalSummaryData;
  onComplete: () => void;
  onEdit: () => void;
  onBack: () => void;
}

export function ReviewPage({ patientId, summary, onComplete, onEdit, onBack }: ReviewPageProps) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [p, docs, events] = await Promise.all([
          getPatient(patientId),
          getDocuments(patientId),
          getTimelineEvents(patientId),
        ]);
        setPatient(p);
        setDocuments(docs);
        setTimeline(events);
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, [patientId]);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await updatePatient(patientId, { status: 'completed' });
      await logAudit({
        actor_type: 'patient',
        action: 'submitted_clinical_history',
        patient_id: patientId,
        details: { summary_generated: true, documents_count: documents.length },
      });
      setSubmitted(true);
      toast('success', 'Your information has been submitted to your doctor');
    } catch (err) {
      toast('error', 'Could not submit. Please try again.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <header className="px-6 py-5"><Logo size="md" /></header>
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-md w-full text-center animate-slide-up">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success-100 mb-6">
              <CheckCircle2 className="w-10 h-10 text-success-600" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-3">All Done!</h1>
            <p className="text-base text-neutral-600 mb-2">
              Your information has been successfully prepared for your consultation.
            </p>
            <p className="text-sm text-neutral-500 mb-8">
              Your doctor will review your clinical history before your appointment. Please wait in the OPD area.
            </p>
            <button onClick={onComplete} className="btn-primary-lg w-full">
              Return to Home
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between">
        <Logo size="md" />
      </header>

      <main className="flex-1 flex items-start justify-center px-6 py-8 overflow-y-auto">
        <div className="max-w-3xl w-full">
          <div className="text-center mb-6 animate-fade-in">
            <h1 className="text-2xl font-bold text-neutral-900 mb-1">Review Your Information</h1>
            <p className="text-sm text-neutral-500">Please review everything before submitting to your doctor</p>
          </div>

          {/* Patient info */}
          <div className="card p-5 mb-4 animate-slide-up">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-5 h-5 text-primary-600" />
              <h2 className="section-title">Personal Information</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-neutral-500">Name:</span> <span className="font-medium text-neutral-900">{patient?.full_name}</span></div>
              <div><span className="text-neutral-500">Age:</span> <span className="font-medium text-neutral-900">{patient?.age || '-'}</span></div>
              <div><span className="text-neutral-500">Gender:</span> <span className="font-medium text-neutral-900 capitalize">{patient?.gender || '-'}</span></div>
              <div><span className="text-neutral-500">Phone:</span> <span className="font-medium text-neutral-900">{patient?.phone_number || '-'}</span></div>
              <div><span className="text-neutral-500">Blood Group:</span> <span className="font-medium text-neutral-900">{patient?.blood_group || '-'}</span></div>
              <div><span className="text-neutral-500">Language:</span> <span className="font-medium text-neutral-900 capitalize">{patient?.preferred_language || 'English'}</span></div>
            </div>
          </div>

          {/* Clinical summary */}
          <div className="card p-5 mb-4 animate-slide-up">
            <div className="flex items-center gap-2 mb-3">
              <FileCheck className="w-5 h-5 text-primary-600" />
              <h2 className="section-title">Clinical Summary</h2>
            </div>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Chief Complaint', value: summary.chief_complaint },
                { label: 'Present Illness', value: summary.history_of_present_illness },
                { label: 'Past Medical', value: summary.past_medical_history },
                { label: 'Drug History', value: summary.drug_history },
                { label: 'Allergies', value: summary.allergy_history },
                { label: 'Family History', value: summary.family_history },
              ].map((s) => (
                s.value && (
                  <div key={s.label}>
                    <span className="text-neutral-500">{s.label}:</span>{' '}
                    <span className="text-neutral-800">{s.value}</span>
                  </div>
                )
              ))}
              {summary.red_flags && summary.red_flags.length > 0 && (
                <div className="flex items-start gap-2 mt-2 p-2 bg-error-50 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-error-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-error-700">
                    Red flags detected: {summary.red_flags.map((f) => f.description).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Documents */}
          <div className="card p-5 mb-4 animate-slide-up">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-primary-600" />
              <h2 className="section-title">Documents ({documents.length})</h2>
            </div>
            {documents.length === 0 ? (
              <p className="text-sm text-neutral-400">No documents uploaded</p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-neutral-400" />
                    <span className="text-neutral-700">{doc.file_name}</span>
                    <span className="text-xs text-neutral-400 capitalize">({doc.document_type?.replace('_', ' ')})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline */}
          {timeline.length > 0 && (
            <div className="card p-5 mb-4 animate-slide-up">
              <div className="flex items-center gap-2 mb-3">
                <CheckCheck className="w-5 h-5 text-primary-600" />
                <h2 className="section-title">Timeline ({timeline.length} events)</h2>
              </div>
              <div className="space-y-1 text-sm">
                {timeline.slice(0, 5).map((event) => (
                  <div key={event.id} className="flex items-center gap-2">
                    <span className="text-neutral-400">{event.event_date ? new Date(event.event_date).getFullYear() : '-'}</span>
                    <span className="text-neutral-700">{event.event_title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button onClick={onEdit} className="btn-secondary">
              Edit Information
            </button>
            <div className="flex gap-3">
              <button onClick={onBack} className="btn-ghost">
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1">
                {submitting ? 'Submitting...' : 'Submit to Doctor'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
