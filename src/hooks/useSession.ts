import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import type { Profile } from '@/types';
import { getCurrentProfile, onAuthChange, signOut as authSignOut } from '@/services/auth';

export type AppRole = 'patient' | 'doctor' | 'admin';

export interface AppSession {
  role: AppRole;
  profile: Profile | null;
  patientId: string | null;
}

export function useSession() {
  const [session, setSession] = useState<AppSession>({
    role: 'patient',
    profile: null,
    patientId: localStorage.getItem('medikiosk_patient_id'),
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const profile = await getCurrentProfile();
      if (!mounted) return;

      if (profile) {
        setSession({
          role: profile.role as AppRole,
          profile,
          patientId: null,
        });
      }
      setLoading(false);
    }

    init();

    const { data: authSubscription } = onAuthChange(async (profile) => {
      if (!mounted) return;
      if (profile) {
        setSession({
          role: profile.role as AppRole,
          profile,
          patientId: null,
        });
      } else {
        setSession((prev) => ({
          ...prev,
          role: 'patient',
          profile: null,
        }));
      }
    });

    return () => {
      mounted = false;
      authSubscription?.subscription.unsubscribe();
    };
  }, []);

  function setPatientId(id: string | null) {
    if (id) {
      localStorage.setItem('medikiosk_patient_id', id);
    } else {
      localStorage.removeItem('medikiosk_patient_id');
    }
    setSession((prev) => ({ ...prev, patientId: id }));
  }

  async function signOut() {
    await authSignOut();
    setSession({ role: 'patient', profile: null, patientId: null });
    localStorage.removeItem('medikiosk_patient_id');
  }

  return { session, loading, setPatientId, signOut };
}
