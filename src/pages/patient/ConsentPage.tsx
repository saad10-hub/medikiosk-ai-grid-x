import { Logo } from '@/components/Logo';
import { ShieldCheck, ArrowLeft, ArrowRight, Info } from 'lucide-react';

interface ConsentPageProps {
  onConsent: () => void;
  onBack: () => void;
  language: string;
}

const CONSENT_TEXT = `MediKiosk collects your medical history and documents to help your doctor prepare for your consultation.

How your information is used:
- Your medical history is collected through an AI-guided interview
- Your uploaded documents are processed using OCR and AI to extract key information
- An AI-generated clinical summary is created for your doctor to review
- Your information is stored securely and is only accessible to authorized medical staff

Important:
- AI assists in organizing your information — it does NOT diagnose or prescribe
- AI does NOT replace your doctor
- Your doctor makes all clinical decisions
- You can withdraw consent at any time by informing hospital staff

Your data is protected with industry-standard encryption and access controls.`;

export function ConsentPage({ onConsent, onBack }: ConsentPageProps) {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between">
        <Logo size="md" />
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-6 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 mb-4">
              <ShieldCheck className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Your Consent</h1>
            <p className="text-base text-neutral-500">Please read and understand before continuing</p>
          </div>

          <div className="card p-6 mb-6 animate-slide-up">
            <div className="prose prose-sm max-w-none text-neutral-700 leading-relaxed">
              {CONSENT_TEXT.split('\n').map((line, i) => {
                if (line.trim() === '') return <div key={i} className="h-3" />;
                if (line.endsWith(':')) return <h3 key={i} className="text-sm font-semibold text-neutral-900 mt-3 mb-1">{line}</h3>;
                if (line.startsWith('- ')) return <p key={i} className="text-sm text-neutral-600 pl-4">{line}</p>;
                return <p key={i} className="text-sm text-neutral-600">{line}</p>;
              })}
            </div>
          </div>

          <div className="card p-4 mb-6 bg-secondary-50 border-secondary-200">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-secondary-600 shrink-0 mt-0.5" />
              <p className="text-sm text-neutral-700">
                By clicking "I Understand and Consent", you agree to share your medical information with your healthcare provider through MediKiosk.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={onConsent} className="btn-primary-lg">
              I Understand and Consent
              <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={onBack} className="btn-ghost">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
