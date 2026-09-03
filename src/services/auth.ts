import { supabase } from './supabase';
import type { Profile } from '@/types';

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUp(email: string, password: string, fullName: string, role: 'doctor' | 'admin', department?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;

  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      email,
      full_name: fullName,
      role,
      department: department || null,
    });
    if (profileError) throw profileError;
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
}

export function onAuthChange(callback: (profile: Profile | null) => void) {
  return supabase.auth.onAuthStateChange(async (_event, session) => {
    (async () => {
      if (!session?.user) {
        callback(null);
        return;
      }
      const profile = await getCurrentProfile();
      callback(profile);
    })();
  });
}
