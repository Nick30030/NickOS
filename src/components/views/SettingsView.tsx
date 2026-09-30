import React, { useState, useEffect } from 'react';
import { useExecution } from '../../context/ExecutionContext';
import { useTheme } from '../../context/ThemeContext';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input, Select } from '../common/Input';
import { APP_CONFIG } from '../../config/app.config';
import { NotificationService } from '../../services/notifications/NotificationService';
import { VoiceService } from '../../services/voice/VoiceService';
import { NotificationPreferences } from '../../types/notification';
import { GoogleCalendarCard } from '../integrations/GoogleCalendarCard';
import { GoogleTasksCard } from '../integrations/GoogleTasksCard';
import {
  Settings,
  Database,
  User,
  Shield,
  Sun,
  Moon,
  Download,
  Upload,
  Layers,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Bell,
  Volume2,
  VolumeX,
  Laptop,
} from 'lucide-react';
import { SUPABASE_CONFIG_STATUS } from '../../lib/supabase';

export const SettingsView: React.FC = () => {
  const { userProfile, storageMode, setIsSupabaseModalOpen } = useExecution();
  const { theme, toggleTheme, setTheme } = useTheme();

  const [name, setName] = useState(userProfile?.name || 'Nick');
  const [timezone, setTimezone] = useState(userProfile?.timezone || 'Europe/London');
  const [workStart, setWorkStart] = useState(userProfile?.workingHoursStart || '08:30');
  const [workEnd, setWorkEnd] = useState(userProfile?.workingHoursEnd || '18:30');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
    enableNotifications: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    reminderLeadTime: 10,
    accountabilityReminderTime: '21:00',
    enableTaskReminders: true,
    enableScheduleChange: true,
    enableAiProposals: true,
    enableInterruptionReminders: true,
    enableDailyReview: true,
  });
  const [notifSavedSuccess, setNotifSavedSuccess] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);

  const [voicePrefs, setVoicePrefs] = useState<any>({
    voiceEnabled: false,
    notifSpeechEnabled: false,
    taskStartAnnounceEnabled: false,
    accountabilityAnnounceEnabled: false,
    aiAnnounceEnabled: false,
    volume: 0.8,
    rate: 1.0,
    pitch: 1.0,
    language: 'en-US',
  });
  const [voiceSavedSuccess, setVoiceSavedSuccess] = useState(false);

  const loadDevices = async () => {
    try {
      const res = await fetch('/api/notifications/devices');
      if (res.ok) {
        const serverDevices = await res.json();
        setDevices(serverDevices);
      } else {
        const local = localStorage.getItem('nick_os_notification_devices');
        setDevices(local ? JSON.parse(local) : []);
      }
    } catch {
      const local = localStorage.getItem('nick_os_notification_devices');
      setDevices(local ? JSON.parse(local) : []);
    }
  };

  useEffect(() => {
    async function loadPrefs() {
      const prefs = await NotificationService.getPreferences();
      if (prefs) {
        setNotifPrefs(prefs);
      }
    }
    loadPrefs();
    loadDevices();
    
    // Load voice preferences
    const loadedVoice = VoiceService.loadPreferences();
    setVoicePrefs(loadedVoice);
  }, []);

  const handleRemoveDevice = async (endpoint: string) => {
    await NotificationService.removeDevice(endpoint);
    await loadDevices();
  };

  const handleSaveVoicePrefs = (e: React.FormEvent) => {
    e.preventDefault();
    VoiceService.updatePreferences(voicePrefs);
    setVoiceSavedSuccess(true);
    // Play a brief confirmation voice speech
    VoiceService.speak("Voice pilot activated, Nick.", true);
    setTimeout(() => setVoiceSavedSuccess(false), 2500);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSaveNotifPrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    await NotificationService.updatePreferences(notifPrefs);
    setNotifSavedSuccess(true);
    setTimeout(() => setNotifSavedSuccess(false), 2500);
  };

  const handleExportData = () => {
    const data: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('nick_os_')) {
        data[key] = localStorage.getItem(key);
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nick-os-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="w-full overflow-hidden max-w-5xl space-y-8 animate-in fade-in duration-200 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800/80 w-full overflow-hidden">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-100 flex items-center gap-2.5 break-words">
            <Settings className="w-7 h-7 text-emerald-400 shrink-0" />
            System Configuration
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 font-mono mt-1.5 leading-relaxed break-words">
            NICK OS operational parameters, database synchronization, and integration roadmap.
          </p>
        </div>
      </div>

      {/* Database & Storage Engine */}
      <Card className="p-6 space-y-5 border border-neutral-800/80 bg-neutral-900/60">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-neutral-200">
                Data Persistence Engine
              </h3>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              PostgreSQL storage via Supabase with client/repository boundary isolation.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsSupabaseModalOpen(true)}
            className="rounded-xl border-neutral-800 hover:bg-neutral-800 shrink-0"
          >
            Manage Supabase Connection
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800/80 text-xs">
            <span className="text-neutral-500 font-mono block">Status:</span>
            <span className="font-semibold text-neutral-200 mt-1 block">
              {SUPABASE_CONFIG_STATUS.isConfigured ? '🟢 Connected to Supabase' : '🟢 Active (Local Storage Fallback)'}
            </span>
          </div>

          <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800/80 text-xs">
            <span className="text-neutral-500 font-mono block">Supabase Endpoint:</span>
            <span className="font-mono text-neutral-300 mt-1 block truncate">
              {SUPABASE_CONFIG_STATUS.url}
            </span>
          </div>
        </div>
      </Card>

      {/* Primary User Profile */}
      <Card className="p-6 space-y-5 border border-neutral-800/80 bg-neutral-900/60">
        <div className="flex items-center gap-2.5">
          <User className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-neutral-200">
            Nick's Execution Parameters
          </h3>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Primary User Name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <Input
              label="Timezone"
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              type="time"
              label="Daily Work Block Start"
              value={workStart}
              onChange={e => setWorkStart(e.target.value)}
            />
            <Input
              type="time"
              label="Daily Work Block End"
              value={workEnd}
              onChange={e => setWorkEnd(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {savedSuccess && (
              <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Parameters updated.
              </span>
            )}
            <div className="ml-auto">
              <Button type="submit" variant="primary" size="sm">
                Save Preferences
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Proactive Notification Engine Config */}
      <Card className="p-5 space-y-4 border border-neutral-800">
        <div className="flex items-center gap-2 pb-2 border-b border-neutral-850">
          <Bell className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-neutral-200">
            Proactive Notification Engine
          </h3>
        </div>

        <form onSubmit={handleSaveNotifPrefs} className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-lg border border-neutral-850">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-neutral-200 block">Proactive Reminders Status</span>
              <span className="text-[10px] text-neutral-400">Enable or disable all system alerts and schedule notifications.</span>
            </div>
            <input
              type="checkbox"
              checked={notifPrefs.enableNotifications}
              onChange={e => setNotifPrefs({ ...notifPrefs, enableNotifications: e.target.checked })}
              className="rounded border-neutral-800 text-amber-500 focus:ring-amber-500 h-4 w-4 bg-neutral-900 cursor-pointer"
            />
          </div>

          {notifPrefs.enableNotifications && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-neutral-400 block font-bold">
                    Quiet Hours Start
                  </label>
                  <input
                    type="time"
                    value={notifPrefs.quietHoursStart}
                    onChange={e => setNotifPrefs({ ...notifPrefs, quietHoursStart: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 text-neutral-200 rounded px-2.5 py-1.5 text-xs font-mono focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-neutral-400 block font-bold">
                    Quiet Hours End
                  </label>
                  <input
                    type="time"
                    value={notifPrefs.quietHoursEnd}
                    onChange={e => setNotifPrefs({ ...notifPrefs, quietHoursEnd: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 text-neutral-200 rounded px-2.5 py-1.5 text-xs font-mono focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-neutral-400 block font-bold">
                    Reminder Lead Time
                  </label>
                  <select
                    value={notifPrefs.reminderLeadTime}
                    onChange={e => setNotifPrefs({ ...notifPrefs, reminderLeadTime: parseInt(e.target.value, 10) })}
                    className="w-full bg-neutral-900 border border-neutral-800 text-neutral-200 rounded px-2.5 py-1.5 text-xs font-mono focus:border-amber-500 focus:outline-hidden"
                  >
                    <option value={5}>5 minutes before</option>
                    <option value={10}>10 minutes before</option>
                    <option value={15}>15 minutes before</option>
                    <option value={30}>30 minutes before</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-neutral-400 block font-bold">
                    Accountability Review Time
                  </label>
                  <input
                    type="time"
                    value={notifPrefs.accountabilityReminderTime}
                    onChange={e => setNotifPrefs({ ...notifPrefs, accountabilityReminderTime: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 text-neutral-200 rounded px-2.5 py-1.5 text-xs font-mono focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-neutral-850">
                <span className="text-[10px] font-mono uppercase text-neutral-400 block font-bold tracking-wider">
                  Notification Channel Subscriptions
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-lg border border-neutral-850 text-xs cursor-pointer">
                    <span className="text-neutral-300">Task Reminders</span>
                    <input
                      type="checkbox"
                      checked={notifPrefs.enableTaskReminders}
                      onChange={e => setNotifPrefs({ ...notifPrefs, enableTaskReminders: e.target.checked })}
                      className="rounded border-neutral-800 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 bg-neutral-900"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-lg border border-neutral-850 text-xs cursor-pointer">
                    <span className="text-neutral-300">Schedule Change Alerts</span>
                    <input
                      type="checkbox"
                      checked={notifPrefs.enableScheduleChange}
                      onChange={e => setNotifPrefs({ ...notifPrefs, enableScheduleChange: e.target.checked })}
                      className="rounded border-neutral-800 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 bg-neutral-900"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-lg border border-neutral-850 text-xs cursor-pointer">
                    <span className="text-neutral-300">AI Proposal Suggestions</span>
                    <input
                      type="checkbox"
                      checked={notifPrefs.enableAiProposals}
                      onChange={e => setNotifPrefs({ ...notifPrefs, enableAiProposals: e.target.checked })}
                      className="rounded border-neutral-800 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 bg-neutral-900"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-lg border border-neutral-850 text-xs cursor-pointer">
                    <span className="text-neutral-300">Interruption Resets</span>
                    <input
                      type="checkbox"
                      checked={notifPrefs.enableInterruptionReminders}
                      onChange={e => setNotifPrefs({ ...notifPrefs, enableInterruptionReminders: e.target.checked })}
                      className="rounded border-neutral-800 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 bg-neutral-900"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-lg border border-neutral-850 text-xs cursor-pointer">
                    <span className="text-neutral-300">Daily Accountability Review</span>
                    <input
                      type="checkbox"
                      checked={notifPrefs.enableDailyReview}
                      onChange={e => setNotifPrefs({ ...notifPrefs, enableDailyReview: e.target.checked })}
                      className="rounded border-neutral-800 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 bg-neutral-900"
                    />
                  </label>
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-between pt-2">
            {notifSavedSuccess && (
              <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Notification parameters updated.
              </span>
            )}
            <div className="ml-auto">
              <Button type="submit" variant="primary" size="sm">
                Save Notification Preferences
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Voice Layer & TTS Preferences */}
      <Card className="p-5 space-y-4 border border-neutral-800" id="voice-preferences-card">
        <form onSubmit={handleSaveVoicePrefs} className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-850">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-neutral-200">
                  Voice Pilot & Speech Layer
                </h3>
                <p className="text-[10px] text-neutral-400 font-mono">
                  Configure real-time notifications, block transitions, and voice pilots.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={voicePrefs.voiceEnabled}
                onChange={e => setVoicePrefs({ ...voicePrefs, voiceEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:after:bg-neutral-950"></div>
              <span className="ml-2 text-xs font-mono font-bold text-neutral-300">
                {voicePrefs.voiceEnabled ? "ACTIVE" : "DISABLED"}
              </span>
            </label>
          </div>

          {voicePrefs.voiceEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-150">
              {/* Left Column: Toggles */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-mono uppercase font-bold text-neutral-500 tracking-wider">
                  Speech Triggers & announcements
                </span>

                <label className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-lg border border-neutral-850 text-xs cursor-pointer">
                  <span className="text-neutral-300">Speak High-Priority Notifications</span>
                  <input
                    type="checkbox"
                    checked={voicePrefs.notifSpeechEnabled}
                    onChange={e => setVoicePrefs({ ...voicePrefs, notifSpeechEnabled: e.target.checked })}
                    className="rounded border-neutral-800 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 bg-neutral-900"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-lg border border-neutral-850 text-xs cursor-pointer">
                  <span className="text-neutral-300">Task Transition Announcements</span>
                  <input
                    type="checkbox"
                    checked={voicePrefs.taskStartAnnounceEnabled}
                    onChange={e => setVoicePrefs({ ...voicePrefs, taskStartAnnounceEnabled: e.target.checked })}
                    className="rounded border-neutral-800 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 bg-neutral-900"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-lg border border-neutral-850 text-xs cursor-pointer">
                  <span className="text-neutral-300">Speak Accountability Reminders</span>
                  <input
                    type="checkbox"
                    checked={voicePrefs.accountabilityAnnounceEnabled}
                    onChange={e => setVoicePrefs({ ...voicePrefs, accountabilityAnnounceEnabled: e.target.checked })}
                    className="rounded border-neutral-800 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 bg-neutral-900"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-lg border border-neutral-850 text-xs cursor-pointer">
                  <span className="text-neutral-300">Speak AI Proposals & Planner Summaries</span>
                  <input
                    type="checkbox"
                    checked={voicePrefs.aiAnnounceEnabled}
                    onChange={e => setVoicePrefs({ ...voicePrefs, aiAnnounceEnabled: e.target.checked })}
                    className="rounded border-neutral-800 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 bg-neutral-900"
                  />
                </label>
              </div>

              {/* Right Column: Audio Output controls */}
              <div className="space-y-3">
                <span className="text-[10px] font-mono uppercase font-bold text-neutral-500 tracking-wider">
                  Engine Parameters
                </span>

                {/* Volume slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono text-neutral-400">
                    <span>Speech Volume</span>
                    <span>{Math.round(voicePrefs.volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={voicePrefs.volume}
                    onChange={e => setVoicePrefs({ ...voicePrefs, volume: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Rate/Speed slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono text-neutral-400">
                    <span>Speech Rate (Speed)</span>
                    <span>{voicePrefs.rate}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={voicePrefs.rate}
                    onChange={e => setVoicePrefs({ ...voicePrefs, rate: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Language Select dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-neutral-400 block">Preferred Voice Language</label>
                  <select
                    value={voicePrefs.language}
                    onChange={e => setVoicePrefs({ ...voicePrefs, language: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="en-US">English (United States)</option>
                    <option value="en-GB">English (United Kingdom)</option>
                    <option value="fr-FR">Français (France)</option>
                    <option value="de-DE">Deutsch (Deutschland)</option>
                    <option value="es-ES">Español (España)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {voiceSavedSuccess && (
              <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Voice parameters saved successfully.
              </span>
            )}
            <div className="ml-auto">
              <Button type="submit" variant="primary" size="sm">
                Save Voice Settings
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Google Calendar Integration */}
      <GoogleCalendarCard />

      {/* Google Tasks Integration */}
      <GoogleTasksCard />

      {/* Connected Devices (Mobile Companion Registry) */}
      <Card className="p-5 space-y-4 border border-neutral-800" id="connected-devices-card">
        <div className="flex items-center gap-2 pb-2 border-b border-neutral-850">
          <Laptop className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-neutral-200">
            Connected Devices & Channels
          </h3>
        </div>

        <p className="text-xs text-neutral-400 font-mono">
          Nick OS distributes high-priority push events to all registered mobile and cockpit interfaces concurrently.
        </p>

        {devices.length === 0 ? (
          <div className="p-4 bg-neutral-950 rounded-lg border border-neutral-850 text-center text-xs font-mono text-neutral-500">
            No devices registered. Click the notification bell in the top header or register this PWA on your mobile Safari client.
          </div>
        ) : (
          <div className="space-y-2">
            {devices.map((dev) => (
              <div 
                key={dev.id} 
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-neutral-950 border border-neutral-850 rounded-lg gap-2"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-200 block">{dev.deviceName}</span>
                    <span className="text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-800/20 px-1.5 py-0.2 rounded">
                      Push Active
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono block truncate max-w-xs md:max-w-md">
                    Endpoint: {dev.endpoint}
                  </span>
                  <span className="text-[9px] text-neutral-500 font-mono block">
                    Registered: {new Date(dev.createdAt).toLocaleString()}
                  </span>
                </div>

                <button
                  onClick={() => handleRemoveDevice(dev.endpoint)}
                  className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-mono text-[10px] font-bold rounded-md border border-rose-500/20 self-start sm:self-center transition-colors cursor-pointer"
                >
                  Revoke Device
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Appearance & Theme */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-neutral-200">
              Visual Theme
            </h3>
            <p className="text-xs text-neutral-400">High-contrast executive dark / clean light theme.</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={theme === 'dark' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTheme('dark')}
              leftIcon={<Moon className="w-3.5 h-3.5" />}
            >
              Dark
            </Button>
            <Button
              variant={theme === 'light' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTheme('light')}
              leftIcon={<Sun className="w-3.5 h-3.5" />}
            >
              Light
            </Button>
          </div>
        </div>
      </Card>

      {/* Data Backup */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-neutral-200">
              Local Data Snapshot
            </h3>
            <p className="text-xs text-neutral-400">Export your local execution state into an immutable JSON backup.</p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportData}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export Backup
          </Button>
        </div>
      </Card>

      {/* Future Roadmap / Integration Contracts */}
      <Card variant="subtle" className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-neutral-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-neutral-300">
            Architectural Readiness & Roadmap
          </h3>
        </div>

        <div className="space-y-2">
          {APP_CONFIG.featuresRoadmap.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-950 border border-neutral-850 text-xs"
            >
              <span className="font-mono text-neutral-300">{item.title}</span>
              <span className={`font-mono text-[11px] px-2 py-0.5 rounded ${
                item.ready ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40' : 'bg-neutral-900 text-neutral-500 border border-neutral-800'
              }`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
