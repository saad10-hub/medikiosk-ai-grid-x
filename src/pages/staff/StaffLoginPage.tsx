import { useState } from 'react';
import { Logo } from '@/components/Logo';
import { signIn, signUp } from '@/services/auth';
import { ArrowLeft, Mail, Lock, User, Building2, Stethoscope } from 'lucide-react';
import { toast } from '@/hooks/useToast';

interface StaffLoginPageProps {
  onBack: () => void;
  onLoginSuccess: () => void;
}

export function StaffLoginPage({ onBack, onLoginSuccess }: StaffLoginPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'doctor' | 'admin'>('doctor');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
        toast('success', 'Login successful');
        onLoginSuccess();
      } else {
        await signUp(email, password, fullName, role, department);
        toast('success', 'Account created. Please sign in.');
        setMode('login');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      toast('error', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between">
        <Logo size="md" />
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-6 animate-fade-in">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 mb-3">
              <Stethoscope className="w-7 h-7 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-1">
              {mode === 'login' ? 'Staff Login' : 'Create Account'}
            </h1>
            <p className="text-sm text-neutral-500">
              {mode === 'login' ? 'Sign in to access the doctor/admin dashboard' : 'Register as a doctor or admin'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="card p-6 space-y-4 animate-slide-up">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="label">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      className="input pl-10"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Dr. John Smith"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Role</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('doctor')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
                        role === 'doctor' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-neutral-300 text-neutral-600'
                      }`}
                    >
                      <Stethoscope className="w-4 h-4" />
                      Doctor
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('admin')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
                        role === 'admin' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-neutral-300 text-neutral-600'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      Admin
                    </button>
                  </div>
                </div>
                {role === 'doctor' && (
                  <div>
                    <label className="label">Department</label>
                    <input
                      className="input"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Cardiology"
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="email"
                  className="input pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@hospital.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="password"
                  className="input pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>

            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="w-full text-center text-sm text-primary-600 hover:text-primary-700"
            >
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </form>

          <div className="mt-4 flex justify-start">
            <button onClick={onBack} className="btn-ghost">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
