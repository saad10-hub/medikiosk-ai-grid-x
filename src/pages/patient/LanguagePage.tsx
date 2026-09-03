import { Logo } from '@/components/Logo';
import { Globe, ArrowRight, ArrowLeft } from 'lucide-react';
import type { Language } from '@/types';

interface LanguagePageProps {
  onSelect: (lang: Language) => void;
  onBack: () => void;
}

const LANGUAGES: { code: Language; name: string; nativeName: string; description: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English', description: 'Continue in English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', description: 'हिंदी में जारी रखें' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', description: 'தமிழில் தொடரவும்' },
];

export function LanguagePage({ onSelect, onBack }: LanguagePageProps) {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between">
        <Logo size="md" />
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 mb-4">
              <Globe className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Select Your Language</h1>
            <p className="text-base text-neutral-500">Choose your preferred language for the consultation preparation</p>
          </div>

          <div className="flex flex-col gap-3">
            {LANGUAGES.map((lang, idx) => (
              <button
                key={lang.code}
                onClick={() => onSelect(lang.code)}
                className="card-hover p-6 flex items-center justify-between text-left group animate-slide-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900">{lang.nativeName}</h2>
                  <p className="text-sm text-neutral-500 mt-0.5">{lang.description}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-neutral-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>

          <div className="mt-8 flex justify-start">
            <button onClick={onBack} className="btn-ghost">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-neutral-400">
            More Indian languages will be supported soon.
          </p>
        </div>
      </main>
    </div>
  );
}
