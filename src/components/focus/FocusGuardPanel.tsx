import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Globe,
  Monitor,
  Laptop,
  Plus,
  Trash2,
  Check,
  RefreshCw,
  AlertTriangle,
  Radio,
  Cpu,
  Layers,
  Info,
  ExternalLink,
  Download,
  Activity,
  Zap,
} from 'lucide-react';
import { useExecution } from '../../context/ExecutionContext';
import { FocusGuardSettings, FocusGuardAgentHeartbeat, FocusGuardMode, UnknownSitePolicy } from '../../types/focus';
import { Button } from '../common/Button';

export const FocusGuardPanel: React.FC = () => {
  const {
    focusGuardSettings,
    updateFocusGuardSettings,
    focusGuardAgents,
    refreshFocusGuardAgents,
    activeExecutionSession,
    isTimerRunning,
  } = useExecution();

  const [settings, setSettings] = useState<FocusGuardSettings>(focusGuardSettings);
  const [newAllowedDomain, setNewAllowedDomain] = useState('');
  const [newBlockedDomain, setNewBlockedDomain] = useState('');
  const [newBlockedApp, setNewBlockedApp] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'mode' | 'domains' | 'apps' | 'policy' | 'agents'>('mode');

  useEffect(() => {
    setSettings(focusGuardSettings);
  }, [focusGuardSettings]);

  const handleToggleEnabled = async () => {
    const next = !settings.enabled;
    const updated = { ...settings, enabled: next };
    setSettings(updated);
    await updateFocusGuardSettings(updated);
  };

  const handleModeChange = async (mode: FocusGuardMode) => {
    const updated = { ...settings, mode };
    setSettings(updated);
    await updateFocusGuardSettings(updated);
  };

  const handlePolicyChange = async (unknownSitePolicy: UnknownSitePolicy) => {
    const updated = { ...settings, unknownSitePolicy };
    setSettings(updated);
    await updateFocusGuardSettings(updated);
  };

  const handleAddAllowedDomain = () => {
    if (!newAllowedDomain.trim()) return;
    const clean = newAllowedDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (settings.allowedDomains.includes(clean)) return;
    const updated = { ...settings, allowedDomains: [...settings.allowedDomains, clean] };
    setSettings(updated);
    setNewAllowedDomain('');
  };

  const handleRemoveAllowedDomain = (domain: string) => {
    const updated = { ...settings, allowedDomains: settings.allowedDomains.filter(d => d !== domain) };
    setSettings(updated);
  };

  const handleAddBlockedDomain = () => {
    if (!newBlockedDomain.trim()) return;
    const clean = newBlockedDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (settings.blockedDomains.includes(clean)) return;
    const updated = { ...settings, blockedDomains: [...settings.blockedDomains, clean] };
    setSettings(updated);
    setNewBlockedDomain('');
  };

  const handleRemoveBlockedDomain = (domain: string) => {
    const updated = { ...settings, blockedDomains: settings.blockedDomains.filter(d => d !== domain) };
    setSettings(updated);
  };

  const handleAddBlockedApp = () => {
    if (!newBlockedApp.trim()) return;
    let clean = newBlockedApp.trim();
    if (!clean.toLowerCase().endsWith('.exe')) {
      clean += '.exe';
    }
    if (settings.blockedApps.some(a => a.toLowerCase() === clean.toLowerCase())) return;
    const updated = { ...settings, blockedApps: [...settings.blockedApps, clean] };
    setSettings(updated);
    setNewBlockedApp('');
  };

  const handleRemoveBlockedApp = (app: string) => {
    const updated = { ...settings, blockedApps: settings.blockedApps.filter(a => a !== app) };
    setSettings(updated);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await updateFocusGuardSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const extensionAgent = focusGuardAgents.find(a => a.clientType === 'browser_extension');
  const windowsAgent = focusGuardAgents.find(a => a.clientType === 'windows_agent');

  return (
    <div className="space-y-6 text-neutral-100">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 p-6 shadow-2xl">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className={`p-3.5 rounded-2xl border transition-all ${
              settings.enabled 
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/10' 
                : 'bg-neutral-800/50 border-neutral-700 text-neutral-500'
            }`}>
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-extrabold tracking-tight text-white">NickOS Focus Guard</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold tracking-wide uppercase border ${
                  settings.enabled 
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300' 
                    : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                }`}>
                  {settings.enabled ? 'Protection Armed' : 'Protection Paused'}
                </span>
              </div>
              <p className="text-xs font-mono text-neutral-400 mt-1 max-w-xl">
                Real-time execution protection matrix. Coordinates Browser Extension (Manifest V3) &amp; Native Windows Agent to lock down distraction vectors during active focus sessions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleEnabled}
              className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.enabled ? 'bg-emerald-500' : 'bg-neutral-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.enabled ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="gap-2 font-mono text-xs cursor-pointer"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  Synced!
                </>
              ) : isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  Save &amp; Sync Matrix
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Live Protection Status Strip */}
        <div className="mt-6 pt-4 border-t border-neutral-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-neutral-950/60 border border-neutral-800">
            <Activity className={`w-4 h-4 ${isTimerRunning ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
            <div>
              <span className="text-[10px] text-neutral-400 block uppercase">Session Engine</span>
              <span className="font-bold text-neutral-200">
                {isTimerRunning ? 'Active Focus Session' : 'No Active Session'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-neutral-950/60 border border-neutral-800">
            <Globe className={`w-4 h-4 ${extensionAgent && extensionAgent.status !== 'disconnected' ? 'text-emerald-400' : 'text-rose-400'}`} />
            <div>
              <span className="text-[10px] text-neutral-400 block uppercase">Chrome/Edge Extension</span>
              <span className="font-bold text-neutral-200">
                {extensionAgent && extensionAgent.status !== 'disconnected' 
                  ? `Connected (v${extensionAgent.version})` 
                  : 'Extension Offline'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-neutral-950/60 border border-neutral-800">
            <Monitor className={`w-4 h-4 ${windowsAgent && windowsAgent.status !== 'disconnected' ? 'text-emerald-400' : 'text-rose-400'}`} />
            <div>
              <span className="text-[10px] text-neutral-400 block uppercase">Windows Native Agent</span>
              <span className="font-bold text-neutral-200">
                {windowsAgent && windowsAgent.status !== 'disconnected'
                  ? `Connected (v${windowsAgent.version})`
                  : 'Agent Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('mode')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer ${
            activeTab === 'mode'
              ? 'bg-neutral-800 border border-neutral-700 text-emerald-400 font-bold'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Enforcement Mode
        </button>

        <button
          onClick={() => setActiveTab('domains')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer ${
            activeTab === 'domains'
              ? 'bg-neutral-800 border border-neutral-700 text-emerald-400 font-bold'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          Web Domains ({settings.mode === 'blacklist' ? settings.blockedDomains.length : settings.allowedDomains.length})
        </button>

        <button
          onClick={() => setActiveTab('apps')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer ${
            activeTab === 'apps'
              ? 'bg-neutral-800 border border-neutral-700 text-emerald-400 font-bold'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          Windows Apps ({settings.blockedApps.length})
        </button>

        <button
          onClick={() => setActiveTab('policy')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer ${
            activeTab === 'policy'
              ? 'bg-neutral-800 border border-neutral-700 text-emerald-400 font-bold'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          Unknown Site Policy
        </button>

        <button
          onClick={() => {
            setActiveTab('agents');
            refreshFocusGuardAgents();
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer ${
            activeTab === 'agents'
              ? 'bg-neutral-800 border border-neutral-700 text-emerald-400 font-bold'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          Agents &amp; Diagnostics ({focusGuardAgents.length})
        </button>
      </div>

      {/* TAB 1: ENFORCEMENT MODE */}
      {activeTab === 'mode' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => handleModeChange('blacklist')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
              settings.mode === 'blacklist'
                ? 'bg-neutral-900/90 border-emerald-500/60 ring-2 ring-emerald-500/20 shadow-xl'
                : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono text-xs font-bold uppercase">
                  Blacklist Mode (Default)
                </span>
                {settings.mode === 'blacklist' && (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-neutral-950 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </div>
              <h3 className="text-base font-bold text-white mb-1">Block Specified Distractions</h3>
              <p className="text-xs text-neutral-400 font-mono leading-relaxed">
                All websites and applications are permitted EXCEPT those explicitly listed in your blocked domains and blocked Windows apps lists.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-800 text-[11px] font-mono text-neutral-400 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Best for flexible deep work with targeted social/media blocking.
            </div>
          </div>

          <div
            onClick={() => handleModeChange('whitelist')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
              settings.mode === 'whitelist'
                ? 'bg-neutral-900/90 border-emerald-500/60 ring-2 ring-emerald-500/20 shadow-xl'
                : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold uppercase">
                  Whitelist Mode (Monk Mode)
                </span>
                {settings.mode === 'whitelist' && (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-neutral-950 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </div>
              <h3 className="text-base font-bold text-white mb-1">Strict Isolation (Whitelisted Only)</h3>
              <p className="text-xs text-neutral-400 font-mono leading-relaxed">
                EVERY website is blocked by default except domains explicitly listed in your allowed domains list (e.g. GitHub, Google Docs, Stack Overflow).
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-800 text-[11px] font-mono text-neutral-400 flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              Maximum protection against mind wandering and unlisted distractions.
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WEB DOMAINS */}
      {activeTab === 'domains' && (
        <div className="space-y-6">
          {/* Mode Notification */}
          <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/80 flex items-center justify-between text-xs font-mono">
            <span className="text-neutral-300">
              Active Mode: <strong className="text-emerald-400 uppercase">{settings.mode}</strong>
            </span>
            <span className="text-neutral-400 text-[11px]">
              Subdomains (e.g., <code className="text-amber-300">docs.google.com</code>) &amp; wildcards are matched dynamically.
            </span>
          </div>

          {/* Blocked Domains Section */}
          <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-950/70 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  Blocked Domains List ({settings.blockedDomains.length})
                </h3>
                <p className="text-xs font-mono text-neutral-400 mt-0.5">
                  Blocked in Blacklist Mode, or when explicitly restricted.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. youtube.com or reddit.com"
                value={newBlockedDomain}
                onChange={e => setNewBlockedDomain(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddBlockedDomain()}
                className="flex-1 rounded-xl bg-neutral-900 border border-neutral-800 px-3.5 py-2 text-xs font-mono text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
              />
              <Button size="sm" variant="secondary" onClick={handleAddBlockedDomain} className="gap-1 font-mono text-xs cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
                Add Domain
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {settings.blockedDomains.map(d => (
                <div key={d} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-mono">
                  <span>{d}</span>
                  <button onClick={() => handleRemoveBlockedDomain(d)} className="hover:text-rose-100 transition-colors cursor-pointer">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {settings.blockedDomains.length === 0 && (
                <p className="text-xs font-mono text-neutral-400 italic">No blocked domains configured.</p>
              )}
            </div>
          </div>

          {/* Allowed Domains Section */}
          <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-950/70 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Allowed Domains Whitelist ({settings.allowedDomains.length})
                </h3>
                <p className="text-xs font-mono text-neutral-400 mt-0.5">
                  Permitted domains when Whitelist (Monk) mode is engaged.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. github.com or stackoverflow.com"
                value={newAllowedDomain}
                onChange={e => setNewAllowedDomain(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddAllowedDomain()}
                className="flex-1 rounded-xl bg-neutral-900 border border-neutral-800 px-3.5 py-2 text-xs font-mono text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
              />
              <Button size="sm" variant="secondary" onClick={handleAddAllowedDomain} className="gap-1 font-mono text-xs cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
                Add Allowed Domain
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {settings.allowedDomains.map(d => (
                <div key={d} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                  <span>{d}</span>
                  <button onClick={() => handleRemoveAllowedDomain(d)} className="hover:text-emerald-100 transition-colors cursor-pointer">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {settings.allowedDomains.length === 0 && (
                <p className="text-xs font-mono text-neutral-400 italic">No allowed domains configured.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WINDOWS APPS */}
      {activeTab === 'apps' && (
        <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-950/70 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Monitor className="w-4 h-4 text-amber-400" />
                Windows Barred Applications List ({settings.blockedApps.length})
              </h3>
              <p className="text-xs font-mono text-neutral-400 mt-0.5">
                Executable process names monitored and terminated by the C# Native Windows Agent during active focus sessions.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Discord.exe or Steam.exe"
              value={newBlockedApp}
              onChange={e => setNewBlockedApp(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddBlockedApp()}
              className="flex-1 rounded-xl bg-neutral-900 border border-neutral-800 px-3.5 py-2 text-xs font-mono text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
            <Button size="sm" variant="secondary" onClick={handleAddBlockedApp} className="gap-1 font-mono text-xs cursor-pointer">
              <Plus className="w-3.5 h-3.5" />
              Add Executable
            </Button>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[10px] font-mono text-neutral-400 uppercase self-center mr-1">Quick Presets:</span>
            {['Discord.exe', 'Steam.exe', 'Spotify.exe', 'League of Legends.exe', 'EpicGamesLauncher.exe', 'Telegram.exe'].map(app => (
              <button
                key={app}
                onClick={() => {
                  if (!settings.blockedApps.some(a => a.toLowerCase() === app.toLowerCase())) {
                    setSettings({ ...settings, blockedApps: [...settings.blockedApps, app] });
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[11px] font-mono text-neutral-300 transition-colors cursor-pointer"
              >
                + {app}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-3">
            {settings.blockedApps.map(app => (
              <div key={app} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs font-mono">
                <Cpu className="w-3 h-3 text-amber-400" />
                <span>{app}</span>
                <button onClick={() => handleRemoveBlockedApp(app)} className="hover:text-amber-100 transition-colors cursor-pointer">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            {settings.blockedApps.length === 0 && (
              <p className="text-xs font-mono text-neutral-400 italic">No Windows barred applications configured.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: UNKNOWN SITE POLICY */}
      {activeTab === 'policy' && (
        <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-950/70 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              Default Policy for Unknown / Unclassified Domains
            </h3>
            <p className="text-xs font-mono text-neutral-400 mt-0.5">
              Determines how browser extension evaluates domain requests when in Whitelist mode or when a domain is not explicitly listed.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div
              onClick={() => handlePolicyChange('allow')}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                settings.unknownSitePolicy === 'allow'
                  ? 'bg-neutral-900 border-emerald-500/60 ring-1 ring-emerald-500/30'
                  : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold font-mono text-emerald-400 uppercase">Allow (Default)</span>
                {settings.unknownSitePolicy === 'allow' && <Check className="w-4 h-4 text-emerald-400" />}
              </div>
              <p className="text-[11px] font-mono text-neutral-400">
                Permit access to unclassified domains unless listed on the blacklist.
              </p>
            </div>

            <div
              onClick={() => handlePolicyChange('warn')}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                settings.unknownSitePolicy === 'warn'
                  ? 'bg-neutral-900 border-amber-500/60 ring-1 ring-amber-500/30'
                  : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold font-mono text-amber-400 uppercase">Warn Before Opening</span>
                {settings.unknownSitePolicy === 'warn' && <Check className="w-4 h-4 text-amber-400" />}
              </div>
              <p className="text-[11px] font-mono text-neutral-400">
                Prompt user in extension popup before opening unlisted sites during focus.
              </p>
            </div>

            <div
              onClick={() => handlePolicyChange('block')}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                settings.unknownSitePolicy === 'block'
                  ? 'bg-neutral-900 border-rose-500/60 ring-1 ring-rose-500/30'
                  : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold font-mono text-rose-400 uppercase">Strict Block</span>
                {settings.unknownSitePolicy === 'block' && <Check className="w-4 h-4 text-rose-400" />}
              </div>
              <p className="text-[11px] font-mono text-neutral-400">
                Block all unlisted sites immediately during focus.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AGENTS & DIAGNOSTICS */}
      {activeTab === 'agents' && (
        <div className="space-y-6">
          {/* Target Endpoint Info */}
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase">Active Target Server Endpoint:</span>
                <code className="text-emerald-300 font-bold text-sm">https://nickos.ai.studio</code>
              </div>
            </div>
            <div className="text-[11px] text-neutral-400">
              Set this URL in Extension Options &amp; Windows Agent <code className="text-amber-300">appsettings.json</code>.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Extension Diagnostics Card */}
            <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-950/70 space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Browser Extension (Manifest V3)</h4>
                    <span className="text-[10px] font-mono text-neutral-400 block">Chrome / Edge Dynamic DeclarativeNetRequest Engine</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                  extensionAgent && extensionAgent.status !== 'disconnected'
                    ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300'
                    : 'bg-rose-950 border-rose-500/50 text-rose-300'
                }`}>
                  {extensionAgent && extensionAgent.status !== 'disconnected' ? 'Connected' : 'Offline'}
                </span>
              </div>

              {extensionAgent ? (
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex justify-between py-1 border-b border-neutral-900">
                    <span className="text-neutral-500">Client ID:</span>
                    <span className="text-neutral-200">{extensionAgent.clientId}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-900">
                    <span className="text-neutral-500">Extension Version:</span>
                    <span className="text-neutral-200">v{extensionAgent.version}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-900">
                    <span className="text-neutral-500">Enforcements Logged:</span>
                    <span className="text-emerald-400 font-bold">{extensionAgent.blockedEnforcementsCount} sites blocked</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-900">
                    <span className="text-neutral-500">Last Heartbeat:</span>
                    <span className="text-neutral-300">{new Date(extensionAgent.lastHeartbeatAt).toLocaleTimeString()}</span>
                  </div>
                  {extensionAgent.lastActionLog && (
                    <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300 mt-2">
                      <strong className="text-neutral-400 uppercase text-[9px] block">Last Log:</strong>
                      {extensionAgent.lastActionLog}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs font-mono text-neutral-400 py-2">
                  No Chrome/Edge extension heartbeat received yet. Install the extension in developer mode from the <code className="text-emerald-400">/extension</code> directory.
                </p>
              )}
            </div>

            {/* Windows Agent Diagnostics Card */}
            <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-950/70 space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Native Windows Agent (.NET 8)</h4>
                    <span className="text-[10px] font-mono text-neutral-400 block">System Tray Process Monitor &amp; Guard</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                  windowsAgent && windowsAgent.status !== 'disconnected'
                    ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300'
                    : 'bg-rose-950 border-rose-500/50 text-rose-300'
                }`}>
                  {windowsAgent && windowsAgent.status !== 'disconnected' ? 'Connected' : 'Offline'}
                </span>
              </div>

              {windowsAgent ? (
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex justify-between py-1 border-b border-neutral-900">
                    <span className="text-neutral-500">Client ID:</span>
                    <span className="text-neutral-200">{windowsAgent.clientId}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-900">
                    <span className="text-neutral-500">Agent Version:</span>
                    <span className="text-neutral-200">v{windowsAgent.version}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-900">
                    <span className="text-neutral-500">Process Enforcements:</span>
                    <span className="text-amber-400 font-bold">{windowsAgent.blockedEnforcementsCount} apps closed</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-900">
                    <span className="text-neutral-500">Last Heartbeat:</span>
                    <span className="text-neutral-300">{new Date(windowsAgent.lastHeartbeatAt).toLocaleTimeString()}</span>
                  </div>
                  {windowsAgent.lastActionLog && (
                    <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300 mt-2">
                      <strong className="text-neutral-400 uppercase text-[9px] block">Last Log:</strong>
                      {windowsAgent.lastActionLog}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs font-mono text-neutral-400 py-2">
                  No Windows native agent heartbeat received yet. Compile and run the C# agent from the <code className="text-amber-400">/windows-agent</code> folder.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
