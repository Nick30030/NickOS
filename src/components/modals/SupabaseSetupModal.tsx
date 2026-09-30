import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useExecution } from '../../context/ExecutionContext';
import { Database, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';
import { SUPABASE_CONFIG_STATUS } from '../../lib/supabase';

export const SupabaseSetupModal: React.FC = () => {
  const { isSupabaseModalOpen, setIsSupabaseModalOpen, storageMode } = useExecution();
  const [copied, setCopied] = useState(false);

  const copySqlPath = () => {
    navigator.clipboard.writeText('supabase/schema.sql');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isSupabaseModalOpen}
      onClose={() => setIsSupabaseModalOpen(false)}
      title="Supabase Database Configuration"
      subtitle="Connect NICK OS directly to your PostgreSQL database and auth."
      maxWidth="lg"
    >
      <div className="space-y-4">
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
              {SUPABASE_CONFIG_STATUS.isConfigured ? 'Supabase Active & Connected' : 'Running in Local Storage Mode'}
            </p>
            <p className="text-neutral-400">
              {SUPABASE_CONFIG_STATUS.isConfigured
                ? `Connected to ${SUPABASE_CONFIG_STATUS.url}. All records synchronize with your Supabase cloud PostgreSQL instance.`
                : 'Local persistence is currently active with zero data loss on browser refresh. To sync to your cloud Supabase database, set the environment variables below.'}
            </p>
          </div>
        </div>

        {/* Setup Steps */}
        <div className="space-y-3 text-xs">
          <h4 className="font-semibold text-neutral-200 uppercase tracking-wider font-mono">Setup Instructions</h4>
          
          <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 space-y-2">
            <span className="font-mono text-neutral-400 block">1. Run SQL Schema Migration:</span>
            <p className="text-neutral-300">
              Open your Supabase Dashboard SQL Editor and execute the schema located in <code className="text-amber-400 font-mono">supabase/schema.sql</code>.
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

          <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 space-y-1.5">
            <span className="font-mono text-neutral-400 block">2. Set Environment Variables:</span>
            <pre className="p-2.5 rounded bg-neutral-900 border border-neutral-800 font-mono text-[11px] text-neutral-300 overflow-x-auto">
{`VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"`}
            </pre>
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
