import { useState } from 'react';
import { Logo } from '@/components/Logo';
import { ProgressBar } from '@/components/ProgressBar';
import { MessageSquare, ArrowLeft, ArrowRight } from 'lucide-react';
import { createClinicalHistory } from '@/services/clinical-history';
import { toast } from '@/hooks/useToast';

interface ChiefComplaintPageProps {
  patientId: string;
  onComplete: (clinicalHistoryId: string, chiefComplaint: string) => void;
  onBack: () => void;
}

export function ChiefComplaintPage({ patientId, onComplete, onBack }: ChiefComplaintPageProps) {
  const [complaint, setComplaint] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const quickOptions = [
    'Fever', 'Chest pain', 'Headache', 'Stomach pain', 'Cough',
    'Breathing difficulty', 'Body pain', 'Dizziness', 'Weakness', 'Other',
  ];

  async function handleSubmit() {
    if (!complaint.trim()) {
      toast('error', 'Please describe your main symptom');
      return;
    }

    setSubmitting(true);
    try {
      const historyId = await createClinicalHistory(patientId, complaint);
      onComplete(historyId, complaint);
    } catch (err) {
      toast('error', 'Could not start your clinical history. Please try again.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between">
        <Logo size="md" />
        <ProgressBar current={5} total={6} label="Chief Complaint" />
      </header>

      <main className="flex-1 flex items-start justify-center px-6 py-8 overflow-y-auto">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-6 animate-fade-in">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 mb-3">
              <MessageSquare className="w-7 h-7 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-1">What is your main problem?</h1>
            <p className="text-sm text-neutral-500">Describe the main symptom or reason for your visit</p>
          </div>

          <div className="card p-6 animate-slide-up">
            <textarea
              className="input text-lg"
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder="e.g. I have fever for 3 days"
              rows={4}
              autoFocus
            />

            <div className="mt-4">
              <p className="text-sm text-neutral-500 mb-2">Quick select:</p>
              <div className="flex flex-wrap gap-2">
                {quickOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setComplaint(opt === 'Other' ? '' : `I have ${opt.toLowerCase()}`)}
                    className="px-3 py-1.5 rounded-lg bg-neutral-100 text-sm text-neutral-700 hover:bg-primary-100 hover:text-primary-700 transition-colors"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button onClick={onBack} className="btn-ghost">
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
                {submitting ? 'Starting...' : 'Start Clinical History'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
