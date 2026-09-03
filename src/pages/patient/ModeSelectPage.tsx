import { Logo } from '@/components/Logo';
import { ProgressBar } from '@/components/ProgressBar';
import { Globe, ArrowLeft, ArrowRight, Stethoscope, Leaf } from 'lucide-react';
import type { HistoryMode } from '@/types';

interface ModeSelectPageProps {
  onSelect: (mode: HistoryMode) => void;
  onBack: () => void;
}

export function ModeSelectPage({ onSelect, onBack }: ModeSelectPageProps) {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between">
        <Logo size="md" />
        <ProgressBar current={3} total={6} label="History Mode" />
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 mb-4">
              <Globe className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Select History Mode</h1>
            <p className="text-base text-neutral-500">Choose the medical system for your clinical history</p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => onSelect('allopathic')}
              className="card-hover p-6 flex items-center justify-between text-left group animate-slide-up"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                  <Stethoscope className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900">Allopathic History</h2>
                  <p className="text-sm text-neutral-500 mt-0.5">Standard medical history with all clinical sections</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-neutral-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
            </button>

            <button
              onClick={() => onSelect('ayush')}
              className="card-hover p-6 flex items-center justify-between text-left group animate-slide-up border-accent-200"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent-100 flex items-center justify-center">
                  <Leaf className="w-6 h-6 text-accent-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900">AYUSH History</h2>
                  <p className="text-sm text-neutral-500 mt-0.5">Ayurvedic assessment: Prakriti, Vikriti, Agni, Koshtha & more</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-neutral-400 group-hover:text-accent-600 group-hover:translate-x-1 transition-all" />
            </button>
          </div>

          <div className="mt-6 card p-4 bg-secondary-50 border-secondary-200">
            <p className="text-xs text-neutral-600">
              <strong>AYUSH mode</strong> includes additional Ayurvedic assessment fields (Prakriti, Vikriti, Agni, Koshtha, Ahara, Vihara, Nidana, and Dashavidha Pariksha) alongside the standard clinical history.
            </p>
          </div>

          <div className="mt-8 flex justify-start">
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
