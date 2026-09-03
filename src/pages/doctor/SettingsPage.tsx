import { User, Mail, Building2, Save } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/services/supabase';
import { toast } from '@/hooks/useToast';
import type { Profile } from '@/types';

interface SettingsPageProps {
  profile: Profile;
}

export function SettingsPage({ profile }: SettingsPageProps) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [department, setDepartment] = useState(profile.department || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, department })
        .eq('id', profile.id);
      if (error) throw error;
      toast('success', 'Settings saved');
    } catch (err) {
      toast('error', 'Could not save settings');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-neutral-900 mb-1">Settings</h1>
      <p className="text-sm text-neutral-500 mb-6">Manage your profile and preferences</p>

      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
            <User className="w-8 h-8 text-primary-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-neutral-900">{profile.full_name}</p>
            <p className="text-sm text-neutral-500 capitalize">{profile.role}{profile.department ? ` • ${profile.department}` : ''}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                className="input pl-10 bg-neutral-50"
                value={profile.email}
                disabled
              />
            </div>
            <p className="text-xs text-neutral-400 mt-1">Email cannot be changed</p>
          </div>

          {profile.role === 'doctor' && (
            <div>
              <label className="label">Department</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  className="input pl-10"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Cardiology"
                />
              </div>
            </div>
          )}
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-primary mt-6">
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="card p-5 mt-4">
        <h2 className="section-title mb-2">About MediKiosk</h2>
        <p className="text-sm text-neutral-500">
          MediKiosk v1.0 — AI-powered clinical pre-consultation platform. AI-generated information is for clinical documentation support and must be reviewed by a qualified healthcare professional.
        </p>
      </div>
    </div>
  );
}
