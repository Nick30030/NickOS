import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Safe environment variable resolution (Vite client, localStorage override, or Node server)
const getEnvVar = (key: string): string => {
  if (typeof window !== 'undefined') {
    if (key === 'VITE_SUPABASE_URL') {
      const stored = localStorage.getItem('nick_os_supabase_url');
      if (stored) return stored;
    }
    if (key === 'VITE_SUPABASE_ANON_KEY') {
      const stored = localStorage.getItem('nick_os_supabase_key');
      if (stored) return stored;
    }
  }

  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch {
    // ignore
  }
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] || '';
    }
  } catch {
    // ignore
  }
  return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project') &&
  !supabaseAnonKey.includes('your-anon-key')
);

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const url = getEnvVar('VITE_SUPABASE_URL');
  const key = getEnvVar('VITE_SUPABASE_ANON_KEY');

  const configured = Boolean(
    url && 
    key && 
    !url.includes('your-project') &&
    !key.includes('your-anon-key')
  );

  if (!configured) {
    return null;
  }
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }
  return supabaseInstance;
}

export function saveSupabaseCredentials(url: string, key: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('nick_os_supabase_url', url.trim());
    localStorage.setItem('nick_os_supabase_key', key.trim());
    supabaseInstance = null;
  }
}

export function clearSupabaseCredentials() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('nick_os_supabase_url');
    localStorage.removeItem('nick_os_supabase_key');
    supabaseInstance = null;
  }
}

export const SUPABASE_CONFIG_STATUS = {
  get isConfigured() {
    const url = getEnvVar('VITE_SUPABASE_URL');
    const key = getEnvVar('VITE_SUPABASE_ANON_KEY');
    return Boolean(url && key && !url.includes('your-project') && !key.includes('your-anon-key'));
  },
  get url() {
    const url = getEnvVar('VITE_SUPABASE_URL');
    return url ? (url.length > 25 ? `${url.substring(0, 22)}...` : url) : 'Not configured';
  },
  get hasAnonKey() {
    const key = getEnvVar('VITE_SUPABASE_ANON_KEY');
    return Boolean(key && !key.includes('your-anon-key'));
  },
};
