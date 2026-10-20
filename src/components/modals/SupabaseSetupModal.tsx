import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useExecution } from '../../context/ExecutionContext';
import { Database, CheckCircle2, AlertCircle, Copy, Check, Save, Trash2, CloudUpload } from 'lucide-react';
import { SUPABASE_CONFIG_STATUS, saveSupabaseCredentials, clearSupabaseCredentials, getSupabaseClient } from '../../lib/supabase';
import { LocalStorageRepository } from '../../services/storage/LocalStorageRepository';
import { SupabaseRepository } from '../../services/storage/SupabaseRepository';
import { getTodayString } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

export const SupabaseSetupModal: React.FC = () => {
  const { isSupabaseModalOpen, setIsSupabaseModalOpen } = useExecution();
  const { mode, user, refreshSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [copied, setCopied] = useState(false);
  const [urlInput, setUrlInput] = useState(() => localStorage.getItem('nick_os_supabase_url') || '');
  const [keyInput, setKeyInput] = useState(() => localStorage.getItem('nick_os_supabase_key') || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrateSuccess, setMigrateSuccess] = useState(false);

  const copySqlPath = () => {
    navigator.clipboard.writeText('supabase/schema.sql');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim() && keyInput.trim()) {
      saveSupabaseCredentials(urlInput, keyInput);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        window.location.reload();
      }, 1500);
    }
  };

  const handleClear = () => {
    clearSupabaseCredentials();
    setUrlInput('');
    setKeyInput('');
    window.location.reload();
  };

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    setIsSigningIn(true);
    try {
      const client = getSupabaseClient();
      if (!client) throw new Error('Enregistrez d’abord l’URL et la clé publique de votre projet Supabase.');
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      setPassword('');
      await refreshSession();
      window.location.reload();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Connexion impossible.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handlePushToCloud = async () => {
    try {
      setIsMigrating(true);
      const localRepo = new LocalStorageRepository();
      const supabaseClient = getSupabaseClient();
      if (!supabaseClient) throw new Error('Supabase client not initialized. Please save valid credentials first.');
      const supabaseRepo = new SupabaseRepository(supabaseClient);

      const todayStr = getTodayString();
      const plan = await localRepo.getDayPlan(todayStr);
      if (plan) {
        await supabaseRepo.saveDayPlan(plan);
        const blocks = await localRepo.getTimeBlocks(plan.id);
        for (const b of blocks) {
          await supabaseRepo.createTimeBlock(b);
        }
      }
      const tasks = await localRepo.getTasks();
      for (const t of tasks) {
        await supabaseRepo.createTask(t);
      }
      setMigrateSuccess(true);
      setTimeout(() => setMigrateSuccess(false), 4000);
    } catch (err: any) {
      console.error('Push to cloud error:', err);
      alert('Error pushing to Supabase: ' + err.message);
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <Modal
      isOpen={isSupabaseModalOpen}
      onClose={() => setIsSupabaseModalOpen(false)}
      title="Supabase Database Configuration"
      subtitle="Connect NICK OS directly to your PostgreSQL database and auth for multi-device cloud sync."
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Status Card */}
        <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
          SUPABASE_CONFIG_STATUS.isConfigured
            ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
            : 'bg-neutral-950 border-neutral-800 text-neutral-300'
        }`}>
          {SUPABASE_CONFIG_STATUS.isConfigured ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1 text-xs">
            <p className="font-semibold text-neutral-100">
              {SUPABASE_CONFIG_STATUS.isConfigured ? (mode === 'supabase' ? 'Supabase : compte connecté' : 'Supabase configuré — connexion requise') : 'Running in Local Storage Mode'}
            </p>
            <p className="text-neutral-400">
              {SUPABASE_CONFIG_STATUS.isConfigured
                ? `Projet configuré : ${SUPABASE_CONFIG_STATUS.url}. Les créations cloud nécessitent un compte connecté et les droits d’accès à vos données.`
                : 'Enter your Supabase credentials below to synchronize your planned days and tasks across all your computers and devices.'}
            </p>
          </div>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSave} className="space-y-3.5 p-4 bg-neutral-950 rounded-xl border border-neutral-800">
          <h4 className="font-semibold text-neutral-200 uppercase tracking-wider font-mono text-xs">
            Direct Cloud Credentials Input
          </h4>
          <Input
            label="Supabase Project URL"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="https://xyzproject.supabase.co"
          />
          <Input
            label="Supabase Anon / Public Key"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          />
          <div className="flex items-center justify-between pt-2">
            {savedSuccess ? (
              <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Credentials saved! Reloading...
              </span>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              {SUPABASE_CONFIG_STATUS.isConfigured && (
                <Button type="button" variant="danger" size="sm" onClick={handleClear} leftIcon={<Trash2 className="w-3.5 h-3.5" />}>
                  Disconnect
                </Button>
              )}
              <Button type="submit" variant="primary" size="sm" leftIcon={<Save className="w-3.5 h-3.5" />}>
                Save & Connect Cloud
              </Button>
            </div>
          </div>
        </form>

        {SUPABASE_CONFIG_STATUS.isConfigured && (
          <form onSubmit={handleSignIn} className="space-y-3 p-4 bg-neutral-950 rounded-xl border border-neutral-800">
            <h4 className="font-semibold text-neutral-200">Compte Supabase</h4>
            {mode === 'supabase' ? (
              <p className="text-sm text-emerald-400">Connecté : {user?.email}</p>
            ) : (
              <>
                <p className="text-xs text-neutral-400">La clé publique configure le projet. Connectez-vous avec un compte Supabase Auth pour enregistrer vos tâches et projets. Utilisez un compte existant ou créez-le dans Authentication → Users de votre projet Supabase.</p>
                <Input type="email" placeholder="Adresse e-mail du compte Supabase" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required />
                <Input type="password" placeholder="Mot de passe du compte Supabase" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required />
                {authError && <p role="alert" className="text-sm text-rose-400">{authError}</p>}
                <Button type="submit" isLoading={isSigningIn}>Se connecter à Supabase</Button>
              </>
            )}
          </form>
        )}

        {/* Push Local Data to Cloud Migration Button */}
        {SUPABASE_CONFIG_STATUS.isConfigured && (
          <div className="p-4 bg-emerald-950/15 rounded-xl border border-emerald-900/40 space-y-3">
            <div>
              <h4 className="font-semibold text-emerald-400 uppercase tracking-wider font-mono text-xs">
                Synchronize Current Day Plan & Tasks to Cloud
              </h4>
              <p className="text-xs text-neutral-400 mt-1">
                Click below to immediately push your current local planner (including your 10 time blocks) to your Supabase database so it is available on all your other devices.
              </p>
            </div>
            <div className="flex items-center justify-between">
              {migrateSuccess ? (
                <span className="text-xs text-emerald-400 font-mono flex items-center gap-1 font-bold">
                  <Check className="w-4 h-4" /> Successfully pushed to Supabase Cloud!
                </span>
              ) : isMigrating ? (
                <span className="text-xs text-amber-400 font-mono animate-pulse">
                  Pushing planner & tasks to cloud...
                </span>
              ) : (
                <div />
              )}
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handlePushToCloud}
                disabled={isMigrating}
                leftIcon={<CloudUpload className="w-4 h-4 text-neutral-950" />}
                className="bg-emerald-400 hover:bg-emerald-500 text-neutral-950 font-bold font-mono"
              >
                {isMigrating ? 'Syncing...' : 'Push Current Plan to Supabase'}
              </Button>
            </div>
          </div>
        )}

        {/* Setup Instructions */}
        <div className="space-y-3 text-xs">
          <h4 className="font-semibold text-neutral-200 uppercase tracking-wider font-mono">SQL Schema Migration</h4>
          <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 space-y-2">
            <span className="font-mono text-neutral-400 block">Run SQL Schema in Supabase Dashboard:</span>
            <p className="text-neutral-300">
              Ensure you execute the schema located in <code className="text-amber-400 font-mono">supabase/schema.sql</code> in your Supabase SQL Editor.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={copySqlPath}
              leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            >
              {copied ? 'Copied Path!' : 'Copy Schema Path (supabase/schema.sql)'}
            </Button>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-neutral-800">
          <Button variant="secondary" onClick={() => setIsSupabaseModalOpen(false)}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
