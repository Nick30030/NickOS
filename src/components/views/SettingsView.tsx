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
import { useLanguage } from '../../context/LanguageContext';
import { GoogleCalendarCard } from '../integrations/GoogleCalendarCard';
import { GoogleTasksCard } from '../integrations/GoogleTasksCard';
import { FocusGuardPanel } from '../focus/FocusGuardPanel';
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
  Mic,
  Square,
  Play,
  Trash2,
  AlertTriangle,
  Globe,
} from 'lucide-react';
import { SUPABASE_CONFIG_STATUS } from '../../lib/supabase';

export const SettingsView: React.FC = () => {
  const { userProfile, storageMode, setIsSupabaseModalOpen } = useExecution();
  const { theme, toggleTheme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

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
  const [systemVoices, setSystemVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [audioClips, setAudioClips] = useState<any[]>([]);
  const [recordingClipId, setRecordingClipId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);

  const startRecording = async (clipId: string) => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("L'enregistrement microphone n'est pas supporté par votre navigateur actuel ou l'iframe sécurisée. Utilisez le bouton UPLOAD pour importer directement un fichier audio.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          VoiceService.saveCustomClip(clipId, base64Data);
          setAudioClips(VoiceService.getCustomClips());
          stream.getTracks().forEach(track => track.stop());
        };
      };

      setMediaRecorder(recorder);
      setRecordingClipId(clipId);
      setIsRecording(true);
      recorder.start();
    } catch (err: any) {
      console.warn('Microphone permission denied or unavailable:', err);
      alert('Accès au microphone refusé ou non disponible dans cet aperçu sécurisé. Utilisez le bouton UPLOAD pour importer directement un fichier audio (.mp3, .wav, .m4a).');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setRecordingClipId(null);
    }
  };

  const playPreview = async (clipId: string) => {
    setPlayingClipId(clipId);
    const success = await VoiceService.playCustomClip(clipId);
    if (!success) {
      const fallbackMap: Record<string, string> = {
        idle_warning: "Nick, attention. Aucun programme n'est planifié pour aujourd'hui. Est-ce normal ?",
        task_start_normal: "Lancement de la tâche. C'est parti, bon travail !",
        task_start_critical: "Attention, démarrage d'une tâche critique. Concentrez-vous pleinement.",
        break_ending: "Fin de la pause. Retour au travail immédiat !",
        focus_violation: "Avertissement Focus Guard. Fermez immédiatement l'application bannie.",
        task_completed: "Félicitations, tâche terminée ! Excellent travail."
      };
      await VoiceService.speak(fallbackMap[clipId] || "Aperçu de la voix.", true);
    }
    setPlayingClipId(null);
  };

  const deleteClip = (clipId: string) => {
    VoiceService.deleteCustomClip(clipId);
    setAudioClips(VoiceService.getCustomClips());
  };

  const handleFileUpload = (clipId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      VoiceService.saveCustomClip(clipId, base64Data);
      setAudioClips(VoiceService.getCustomClips());
    };
  };

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

    // Load custom audio vault clips
    setAudioClips(VoiceService.getCustomClips());

    // Initialize system voices
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setSystemVoices(voices);
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
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

  const handleExportTypicalDay = () => {
    const dayPlans = localStorage.getItem('nick_os_day_plans') || '[]';
    const timeBlocks = localStorage.getItem('nick_os_time_blocks') || '[]';
    const payload = {
      exportType: 'nick_os_typical_day_template',
      createdAt: new Date().toISOString(),
      dayPlans: JSON.parse(dayPlans),
      timeBlocks: JSON.parse(timeBlocks),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nick-os-typical-day-template.json`;
    a.click();
  };

  const handleImportTypicalDay = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.dayPlans) {
          localStorage.setItem('nick_os_day_plans', JSON.stringify(json.dayPlans));
        }
        if (json.timeBlocks) {
          localStorage.setItem('nick_os_time_blocks', JSON.stringify(json.timeBlocks));
        }
        alert('Journée type importée avec succès ! Rechargement...');
        window.location.reload();
      } catch (err) {
        alert('Erreur lors de l’importation du fichier JSON : ' + err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full overflow-hidden max-w-5xl space-y-8 animate-in fade-in duration-200 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800/80 w-full overflow-hidden">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-100 flex items-center gap-2.5 break-words">
            <Settings className="w-7 h-7 text-emerald-400 shrink-0" />
            {t('settingsHeader', 'System Configuration')}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 font-mono mt-1.5 leading-relaxed break-words">
            {t('settingsSubtitle', 'Personal configuration, storage modes, theme and system integrations for Nick.')}
          </p>
        </div>
      </div>

      {/* Focus Guard Protection Matrix */}
      <FocusGuardPanel />

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
            {t('profileSection', "Nick's Execution Parameters")}
          </h3>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={t('fullName', 'Primary User Name')}
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <Input
              label={t('timezone', 'Timezone')}
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              type="time"
              label={t('workStart', 'Daily Work Block Start')}
              value={workStart}
              onChange={e => setWorkStart(e.target.value)}
            />
            <Input
              type="time"
              label={t('workEnd', 'Daily Work Block End')}
              value={workEnd}
              onChange={e => setWorkEnd(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {savedSuccess && (
              <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {t('profileSaved', 'Parameters updated.')}
              </span>
            )}
            <div className="ml-auto">
              <Button type="submit" variant="primary" size="sm">
                {t('saveProfile', 'Save Preferences')}
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Proactive Notification Engine Config */}
      {/* Proactive Notification Engine Config */}
      <Card className="p-5 space-y-4 border border-neutral-800">
        <div className="flex items-center gap-2 pb-2 border-b border-neutral-850">
          <Bell className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-neutral-200">
            {t('notificationsCardTitle', 'Proactive Notification Subscriptions')}
          </h3>
        </div>

        <form onSubmit={handleSaveNotifPrefs} className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-lg border border-neutral-850">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-neutral-200 block">{t('desktopWorkAlerts', 'Proactive Reminders Status')}</span>
              <span className="text-[10px] text-neutral-400">{t('desktopAlertsActiveDesc', 'Enable or disable all system alerts and schedule notifications.')}</span>
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
                    {t('reminderLeadTime', 'Reminder Lead Time')}
                  </label>
                  <select
                    value={notifPrefs.reminderLeadTime}
                    onChange={e => setNotifPrefs({ ...notifPrefs, reminderLeadTime: parseInt(e.target.value, 10) })}
                    className="w-full bg-neutral-900 border border-neutral-800 text-neutral-200 rounded px-2.5 py-1.5 text-xs font-mono focus:border-amber-500 focus:outline-hidden"
                  >
                    <option value={5}>5 min</option>
                    <option value={10}>10 min</option>
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-neutral-400 block font-bold">
                    {t('accountabilityReviewTime', 'Accountability Review Time')}
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
                  {t('notificationsCardTitle', 'Notification Channel Subscriptions')}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-lg border border-neutral-850 text-xs cursor-pointer">
                    <span className="text-neutral-300">{t('taskReminders', 'Task Reminders')}</span>
                    <input
                      type="checkbox"
                      checked={notifPrefs.enableTaskReminders}
                      onChange={e => setNotifPrefs({ ...notifPrefs, enableTaskReminders: e.target.checked })}
                      className="rounded border-neutral-800 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 bg-neutral-900"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-lg border border-neutral-850 text-xs cursor-pointer">
                    <span className="text-neutral-300">{t('scheduleChangeAlerts', 'Schedule Change Alerts')}</span>
                    <input
                      type="checkbox"
                      checked={notifPrefs.enableScheduleChange}
                      onChange={e => setNotifPrefs({ ...notifPrefs, enableScheduleChange: e.target.checked })}
                      className="rounded border-neutral-800 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 bg-neutral-900"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-lg border border-neutral-850 text-xs cursor-pointer">
                    <span className="text-neutral-300">{t('aiProposalSuggestions', 'AI Proposal Suggestions')}</span>
                    <input
                      type="checkbox"
                      checked={notifPrefs.enableAiProposals}
                      onChange={e => setNotifPrefs({ ...notifPrefs, enableAiProposals: e.target.checked })}
                      className="rounded border-neutral-800 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 bg-neutral-900"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-lg border border-neutral-850 text-xs cursor-pointer">
                    <span className="text-neutral-300">{t('interruptionResets', 'Interruption Resets')}</span>
                    <input
                      type="checkbox"
                      checked={notifPrefs.enableInterruptionReminders}
                      onChange={e => setNotifPrefs({ ...notifPrefs, enableInterruptionReminders: e.target.checked })}
                      className="rounded border-neutral-800 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 bg-neutral-900"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-lg border border-neutral-850 text-xs cursor-pointer">
                    <span className="text-neutral-300">{t('dailyAccountabilityReview', 'Daily Accountability Review')}</span>
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
                <CheckCircle2 className="w-3.5 h-3.5" /> {t('profileSaved', 'Notification parameters updated.')}
              </span>
            )}
            <div className="ml-auto">
              <Button type="submit" variant="primary" size="sm">
                {t('saveNotifPrefs', 'Save Notification Preferences')}
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Multilingual Support Card */}
      <Card className="p-5 space-y-4 border border-neutral-800" id="language-card">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-850">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-neutral-200">
                {t('languageCardTitle', 'Interface Language (Multilingual Support)')}
              </h3>
              <p className="text-[10px] text-neutral-400 font-mono">
                {t('languageCardSubtitle', 'Switch between French, English, Chinese, and Spanish instantly.')}
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-mono uppercase font-bold border border-emerald-500/20">
            {language}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { code: 'fr', label: 'Français', flag: '🇫🇷' },
            { code: 'en', label: 'English', flag: '🇬🇧' },
            { code: 'zh', label: '中文 (Chinese)', flag: '🇨🇳' },
            { code: 'es', label: 'Español', flag: '🇪🇸' },
          ].map(lang => (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code as any)}
              className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-center gap-2 transition-all cursor-pointer ${
                language === lang.code
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold shadow-xs'
                  : 'bg-neutral-950 border-neutral-850 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Theme Preference Card */}
      <Card className="p-5 space-y-4 border border-neutral-800" id="theme-card">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-850">
          <div className="flex items-center gap-2">
            {theme === 'dark' ? <Moon className="w-4 h-4 text-sky-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-neutral-200">
                {t('themeCardTitle', 'Mode Thème (Clair / Sombre)')}
              </h3>
              <p className="text-[10px] text-neutral-400 font-mono">
                {t('themeCardSubtitle', 'Basculez entre le thème sombre souverain et le thème clair haute lisibilité.')}
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded-full font-mono uppercase font-bold">
            {theme === 'dark' ? t('themeDark', 'Sombre') : t('themeLight', 'Clair')}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold shadow-xs'
                : 'bg-neutral-950 border-neutral-850 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Moon className="w-4 h-4 text-sky-400" />
            <span>{t('themeDark', 'Thème Sombre')}</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
              theme === 'light'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold shadow-xs'
                : 'bg-neutral-950 border-neutral-850 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Sun className="w-4 h-4 text-amber-400" />
            <span>{t('themeLight', 'Thème Clair')}</span>
          </button>
        </div>
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

                {/* Specific Voice Select dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-neutral-400 block">Select Voice Actor</label>
                  <select
                    value={voicePrefs.selectedVoiceURI || ''}
                    onChange={e => setVoicePrefs({ ...voicePrefs, selectedVoiceURI: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Default Language Voice --</option>
                    {systemVoices
                      .filter(v => v.lang.toLowerCase().startsWith(voicePrefs.language.toLowerCase()))
                      .map(voice => (
                        <option key={voice.voiceURI} value={voice.voiceURI}>
                          {voice.name} {voice.localService ? '(On-Device)' : '(Online)'}
                        </option>
                      ))}
                  </select>
                  <p className="text-[10px] text-neutral-500 font-mono">
                    If you have custom cloned voices installed on your OS, they will appear above.
                  </p>
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

      {/* Vocal Vault — Personal Voice Recordings Card */}
      <Card className="p-5 space-y-4 border border-neutral-800 bg-neutral-900/40" id="vocal-vault-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-850">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-amber-500 animate-pulse" />
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-neutral-200">
                Nick OS Vocal Vault — Voix Réelle
              </h3>
              <p className="text-[10px] text-neutral-400 font-mono">
                Enregistrez vos propres fichiers audio depuis votre téléphone ou PC pour servir d'alertes personnalisées basées sur la criticité.
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-mono border border-amber-500/20">
            {audioClips.filter(c => c.base64Data).length} / {audioClips.length} ACTIFS
          </span>
        </div>

        <p className="text-xs text-neutral-400 font-mono leading-relaxed bg-neutral-950/60 p-3 rounded-xl border border-neutral-850/50">
          💡 <strong>Principe de l'IA Hybride :</strong> Si vous n'avez pas encore enregistré votre voix pour une alerte, Nick OS est assez intelligent pour utiliser la <strong>synthèse vocale standard (TTS)</strong>. Dès que vous enregistrez un audio ci-dessous, le système bascule automatiquement sur votre propre voix enregistrée.
        </p>

        <div className="grid grid-cols-1 gap-3">
          {audioClips.map((clip) => {
            const hasAudio = !!clip.base64Data;
            const isThisRecording = recordingClipId === clip.id;
            const isThisPlaying = playingClipId === clip.id;

            return (
              <div
                key={clip.id}
                className={`p-3.5 rounded-xl border transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isThisRecording
                    ? 'bg-red-950/20 border-red-500/40 animate-pulse'
                    : hasAudio
                    ? 'bg-emerald-950/5 border-emerald-900/30 hover:border-emerald-800/40'
                    : 'bg-neutral-950 border-neutral-850/50'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-neutral-200">{clip.name}</span>
                    <span
                      className={`text-[8px] font-mono px-1.5 py-0.5 rounded uppercase font-bold shrink-0 ${
                        clip.category === 'critical'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : clip.category === 'high'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : clip.category === 'normal'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {clip.category}
                    </span>
                    <span
                      className={`text-[8px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${
                        hasAudio
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                          : 'bg-neutral-800 text-neutral-500'
                      }`}
                    >
                      {hasAudio ? '🟢 Voix Enregistrée' : '🟡 Synthèse Vocale'}
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400 font-mono leading-relaxed">
                    {clip.description}
                  </p>
                </div>

                {/* Control Panel */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                  {/* Record microphone trigger */}
                  {isThisRecording ? (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={stopRecording}
                      className="px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-mono text-xs bg-red-600 hover:bg-red-700 animate-pulse"
                    >
                      <Square className="w-3 h-3 fill-white" />
                      STOP
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => startRecording(clip.id)}
                      disabled={isRecording && !isThisRecording}
                      className="px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-mono text-xs border-neutral-800 hover:bg-neutral-850"
                    >
                      <Mic className="w-3 h-3 text-red-500" />
                      REC
                    </Button>
                  )}

                  {/* Upload file trigger */}
                  <label className="cursor-pointer shrink-0">
                    <span className="px-2.5 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-850 text-xs font-mono inline-flex items-center gap-1.5">
                      <Upload className="w-3 h-3 text-neutral-400" />
                      UPLOAD
                    </span>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => handleFileUpload(clip.id, e)}
                      className="hidden"
                      disabled={isRecording}
                    />
                  </label>

                  {/* Play audio/preview */}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => playPreview(clip.id)}
                    disabled={isRecording}
                    className="p-1.5 rounded-lg border-neutral-800 text-neutral-300 hover:bg-neutral-850"
                  >
                    <Play className={`w-3.5 h-3.5 ${isThisPlaying ? 'animate-spin text-amber-500' : ''}`} />
                  </Button>

                  {/* Reset/Delete audio trigger */}
                  {hasAudio && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => deleteClip(clip.id)}
                      disabled={isRecording}
                      className="p-1.5 rounded-lg border-neutral-800 text-red-400 hover:bg-red-950/30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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

      {/* Typical Day JSON Template Export & Import */}
      <Card className="p-5 space-y-4 border border-neutral-800">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-850">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-neutral-200">
              Typical Day Templates (JSON)
            </h3>
            <p className="text-xs text-neutral-400">
              Export and import complex multi-block daily schedules so you never have to rebuild them manually.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportTypicalDay}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export Day Template (.json)
          </Button>

          <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-mono border border-neutral-700 transition-colors">
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Import Day Template (.json)</span>
            <input type="file" accept=".json" onChange={handleImportTypicalDay} className="hidden" />
          </label>
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
