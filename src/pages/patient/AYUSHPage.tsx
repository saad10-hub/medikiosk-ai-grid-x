import { Logo } from '@/components/Logo';
import { ProgressBar } from '@/components/ProgressBar';
import { Leaf, ArrowLeft, ArrowRight } from 'lucide-react';
import { AYUSH_FIELDS, DASHAVIDHA_PARIKSHA_FIELDS } from '@/services/ayush';
import type { AYUSHData } from '@/types';
import { useState } from 'react';

interface AYUSHPageProps {
  onComplete: (data: AYUSHData) => void;
  onBack: () => void;
}

export function AYUSHPage({ onComplete, onBack }: AYUSHPageProps) {
  const [data, setData] = useState<AYUSHData>({
    prakriti: '',
    vikriti: '',
    agni: '',
    koshtha: '',
    ahara: '',
    vihara: '',
    nidana: '',
    dashavidha_pariksha: {
      dooshya: '', desha: '', kala: '', prana: '',
      vikriti_samkhya: '', vikriti_prakriti: '', sara: '',
      samhanana: '', pramana: '', satmya: '', sattva: '',
    },
  });

  function update(field: string, value: string) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  function updatePariksha(field: string, value: string) {
    setData((prev) => ({
      ...prev,
      dashavidha_pariksha: { ...prev.dashavidha_pariksha, [field]: value },
    }));
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between">
        <Logo size="md" />
        <ProgressBar current={4} total={6} label="AYUSH Assessment" />
      </header>

      <main className="flex-1 flex items-start justify-center px-6 py-8 overflow-y-auto">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-6 animate-fade-in">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-100 mb-3">
              <Leaf className="w-7 h-7 text-accent-600" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-1">AYUSH Assessment</h1>
            <p className="text-sm text-neutral-500">Ayurvedic clinical history fields (optional)</p>
          </div>

          <div className="card p-6 mb-4 animate-slide-up">
            <h2 className="section-title mb-4">Basic Assessment</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AYUSH_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="label">{field.label}</label>
                  <input
                    className="input"
                    value={data[field.key as keyof AYUSHData] as string || ''}
                    onChange={(e) => update(field.key, e.target.value)}
                    placeholder={field.description}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6 mb-4 animate-slide-up">
            <h2 className="section-title mb-1">Dashavidha Pariksha (Ten-fold Examination)</h2>
            <p className="section-subtitle mb-4">Detailed Ayurvedic diagnostic framework</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DASHAVIDHA_PARIKSHA_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="label">{field.label}</label>
                  <input
                    className="input"
                    value={data.dashavidha_pariksha?.[field.key as keyof typeof data.dashavidha_pariksha] || ''}
                    onChange={(e) => updatePariksha(field.key, e.target.value)}
                    placeholder="Enter details"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={onBack} className="btn-ghost">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button onClick={() => onComplete(data)} className="btn-primary">
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
