import { useState } from 'react';
import { Logo } from '@/components/Logo';
import { ProgressBar } from '@/components/ProgressBar';
import { User, ArrowLeft, ArrowRight } from 'lucide-react';
import type { Language, HistoryMode } from '@/types';
import { createPatient } from '@/services/patients';
import { toast } from '@/hooks/useToast';

interface PatientInfoPageProps {
  language: Language;
  historyMode: HistoryMode;
  onComplete: (patientId: string) => void;
  onBack: () => void;
}

export function PatientInfoPage({ language, historyMode, onComplete, onBack }: PatientInfoPageProps) {
  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: '',
    age: '',
    gender: '',
    phone_number: '',
    abha_id: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    blood_group: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!formData.full_name.trim()) e.full_name = 'Full name is required';
    if (!formData.age && !formData.date_of_birth) e.age = 'Age or date of birth is required';
    if (!formData.gender) e.gender = 'Gender is required';
    if (!formData.phone_number.trim()) e.phone_number = 'Phone number is required';
    if (formData.phone_number && !/^\d{10}$/.test(formData.phone_number.replace(/\D/g, ''))) {
      e.phone_number = 'Please enter a valid 10-digit phone number';
    }
    if (formData.emergency_contact_phone && !/^\d{10}$/.test(formData.emergency_contact_phone.replace(/\D/g, ''))) {
      e.emergency_contact_phone = 'Please enter a valid 10-digit phone number';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) {
      toast('error', 'Please fix the errors before continuing');
      return;
    }

    setSubmitting(true);
    try {
      const patient = await createPatient({
        full_name: formData.full_name,
        date_of_birth: formData.date_of_birth || undefined,
        age: formData.age ? parseInt(formData.age) : undefined,
        gender: formData.gender,
        phone_number: formData.phone_number,
        preferred_language: language,
        abha_id: formData.abha_id || undefined,
        address: formData.address || undefined,
        emergency_contact_name: formData.emergency_contact_name || undefined,
        emergency_contact_phone: formData.emergency_contact_phone || undefined,
        blood_group: formData.blood_group || undefined,
        history_mode: historyMode,
      });
      onComplete(patient.id);
    } catch (err) {
      toast('error', 'Could not save your information. Please try again.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  function update(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between">
        <Logo size="md" />
        <ProgressBar current={4} total={6} label="Patient Information" />
      </header>

      <main className="flex-1 flex items-start justify-center px-6 py-8 overflow-y-auto">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-6 animate-fade-in">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 mb-3">
              <User className="w-7 h-7 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-1">Your Information</h1>
            <p className="text-sm text-neutral-500">Please provide your personal details</p>
          </div>

          <div className="card p-6 animate-slide-up">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Full Name <span className="text-error-500">*</span></label>
                <input
                  className="input"
                  value={formData.full_name}
                  onChange={(e) => update('full_name', e.target.value)}
                  placeholder="Enter your full name"
                />
                {errors.full_name && <p className="text-xs text-error-500 mt-1">{errors.full_name}</p>}
              </div>

              <div>
                <label className="label">Date of Birth</label>
                <input
                  type="date"
                  className="input"
                  value={formData.date_of_birth}
                  onChange={(e) => update('date_of_birth', e.target.value)}
                />
              </div>

              <div>
                <label className="label">Age <span className="text-neutral-400 text-xs">(or DOB)</span></label>
                <input
                  type="number"
                  className="input"
                  value={formData.age}
                  onChange={(e) => update('age', e.target.value)}
                  placeholder="e.g. 45"
                  min="0"
                  max="120"
                />
                {errors.age && <p className="text-xs text-error-500 mt-1">{errors.age}</p>}
              </div>

              <div>
                <label className="label">Gender <span className="text-error-500">*</span></label>
                <select
                  className="input"
                  value={formData.gender}
                  onChange={(e) => update('gender', e.target.value)}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                {errors.gender && <p className="text-xs text-error-500 mt-1">{errors.gender}</p>}
              </div>

              <div>
                <label className="label">Blood Group</label>
                <select
                  className="input"
                  value={formData.blood_group}
                  onChange={(e) => update('blood_group', e.target.value)}
                >
                  <option value="">Select blood group</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Phone Number <span className="text-error-500">*</span></label>
                <input
                  className="input"
                  value={formData.phone_number}
                  onChange={(e) => update('phone_number', e.target.value)}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                />
                {errors.phone_number && <p className="text-xs text-error-500 mt-1">{errors.phone_number}</p>}
              </div>

              <div>
                <label className="label">ABHA ID <span className="text-neutral-400 text-xs">(optional)</span></label>
                <input
                  className="input"
                  value={formData.abha_id}
                  onChange={(e) => update('abha_id', e.target.value)}
                  placeholder="e.g. 12-3456-7890-1234"
                />
              </div>

              <div className="md:col-span-2">
                <label className="label">Address</label>
                <textarea
                  className="input"
                  value={formData.address}
                  onChange={(e) => update('address', e.target.value)}
                  placeholder="Enter your address"
                  rows={2}
                />
              </div>

              <div>
                <label className="label">Emergency Contact Name</label>
                <input
                  className="input"
                  value={formData.emergency_contact_name}
                  onChange={(e) => update('emergency_contact_name', e.target.value)}
                  placeholder="e.g. Spouse / Parent"
                />
              </div>

              <div>
                <label className="label">Emergency Contact Phone</label>
                <input
                  className="input"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => update('emergency_contact_phone', e.target.value)}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                />
                {errors.emergency_contact_phone && <p className="text-xs text-error-500 mt-1">{errors.emergency_contact_phone}</p>}
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button onClick={onBack} className="btn-ghost">
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
                {submitting ? 'Saving...' : 'Continue'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
