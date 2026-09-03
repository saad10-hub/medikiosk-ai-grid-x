import { Logo } from '@/components/Logo';
import { Stethoscope, Shield, Accessibility, FileText, ArrowRight, LogIn, PlayCircle } from 'lucide-react';

interface WelcomePageProps {
  onStart: () => void;
  onExistingPatient: () => void;
  onStaffLogin: () => void;
  onDemo: () => void;
}

export function WelcomePage({ onStart, onExistingPatient, onStaffLogin, onDemo }: WelcomePageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between">
        <Logo size="md" />
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Shield className="w-4 h-4" />
          <span>HIPAA-aware</span>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-10 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary-600 mb-6 shadow-lg shadow-primary-600/20">
              <Stethoscope className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-3 text-balance">
              Prepare Before You Consult.
            </h1>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto text-balance">
              Complete your medical history before meeting your doctor. Save consultation time and help your doctor give better care.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3 max-w-md mx-auto">
            <button
              onClick={onStart}
              className="btn-primary-lg group animate-slide-up"
            >
              Start Consultation Preparation
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={onExistingPatient}
              className="btn-secondary animate-slide-up"
            >
              Existing Patient
            </button>
            <button
              onClick={onStaffLogin}
              className="btn-ghost animate-slide-up"
            >
              <LogIn className="w-4 h-4" />
              Staff / Doctor Login
            </button>
            <button
              onClick={onDemo}
              className="btn-ghost text-accent-600 hover:text-accent-700 animate-slide-up"
            >
              <PlayCircle className="w-4 h-4" />
              Try Demo mode (Rahul Kumar)
            </button>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <div className="card p-5 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary-100 mb-3">
                <Shield className="w-5 h-5 text-primary-600" />
              </div>
              <h3 className="text-sm font-semibold text-neutral-900 mb-1">Private & Secure</h3>
              <p className="text-xs text-neutral-500">Your medical information is encrypted and protected.</p>
            </div>
            <div className="card p-5 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-secondary-100 mb-3">
                <Accessibility className="w-5 h-5 text-secondary-600" />
              </div>
              <h3 className="text-sm font-semibold text-neutral-900 mb-1">Accessible to All</h3>
              <p className="text-xs text-neutral-500">Large text, voice input, and simple navigation.</p>
            </div>
            <div className="card p-5 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-accent-100 mb-3">
                <FileText className="w-5 h-5 text-accent-600" />
              </div>
              <h3 className="text-sm font-semibold text-neutral-900 mb-1">AI-Assisted</h3>
              <p className="text-xs text-neutral-500">AI organizes your history for your doctor to review.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center">
        <p className="text-xs text-neutral-400">
          AI-generated information is for clinical documentation support and must be reviewed by a qualified healthcare professional.
        </p>
      </footer>
    </div>
  );
}
