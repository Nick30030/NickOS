import { VoicePreferences, VoiceLogEntry } from '../../types/voice';
import { VoiceCommandService, VoiceCommandResult } from './VoiceCommandService';

const PREFS_KEY = 'nick_os_voice_preferences';
const LOGS_KEY = 'nick_os_voice_logs';

const DEFAULT_PREFS: VoicePreferences = {
  voiceEnabled: false,
  notifSpeechEnabled: false,
  taskStartAnnounceEnabled: false,
  accountabilityAnnounceEnabled: false,
  aiAnnounceEnabled: false,
  volume: 0.8,
  rate: 1.0,
  pitch: 1.0,
  language: 'en-US',
  selectedVoiceURI: '',
};

export class VoiceService {
  private static preferences: VoicePreferences = DEFAULT_PREFS;
  private static lastAnnouncedTaskId: string | null = null;

  static {
    this.loadPreferences();
  }

  /**
   * Check if speech synthesis (TTS) is supported on the device
   */
  public static isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  /**
   * Check if speech recognition (STT) is supported on the device
   */
  public static isRecognitionSupported(): boolean {
    return typeof window !== 'undefined' && 
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }

  /**
   * Load voice preferences from local storage
   */
  public static loadPreferences(): VoicePreferences {
    if (typeof window === 'undefined') return DEFAULT_PREFS;
    try {
      const stored = localStorage.getItem(PREFS_KEY);
      if (stored) {
        this.preferences = { ...DEFAULT_PREFS, ...JSON.parse(stored) };
      } else {
        this.preferences = { ...DEFAULT_PREFS };
      }
    } catch (err) {
      console.warn('[VoiceService] Failed to load voice preferences:', err);
      this.preferences = { ...DEFAULT_PREFS };
    }
    return this.preferences;
  }

  /**
   * Update and persist voice preferences
   */
  public static updatePreferences(updates: Partial<VoicePreferences>): VoicePreferences {
    this.preferences = { ...this.preferences, ...updates };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(this.preferences));
      } catch (err) {
        console.warn('[VoiceService] Failed to save voice preferences:', err);
      }
    }
    return this.preferences;
  }

  /**
   * Retrieves the current loaded preferences
   */
  public static getPreferences(): VoicePreferences {
    return this.preferences;
  }

  /**
   * Play speech using Web Speech Synthesis API
   */
  public static speak(text: string, force = false): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isSupported()) {
        console.warn('[VoiceService] Speech synthesis not supported.');
        resolve();
        return;
      }

      // Check if global voice is enabled OR we are forcing the output (e.g., user manual play)
      if (!this.preferences.voiceEnabled && !force) {
        console.log('[VoiceService] Speech skipped (voice disabled in preferences).');
        resolve();
        return;
      }

      try {
        // Cancel ongoing speaking to prevent stacked queue locks
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.volume = this.preferences.volume;
        utterance.rate = this.preferences.rate;
        utterance.pitch = this.preferences.pitch;
        utterance.lang = this.preferences.language;

        // Try to match specific preferred voice if possible
        const voices = window.speechSynthesis.getVoices();
        let chosenVoice = null;
        if (this.preferences.selectedVoiceURI) {
          chosenVoice = voices.find(v => v.voiceURI === this.preferences.selectedVoiceURI);
        }
        if (!chosenVoice) {
          chosenVoice = voices.find(v => v.lang.startsWith(this.preferences.language));
        }
        if (chosenVoice) {
          utterance.voice = chosenVoice;
        }

        utterance.onend = () => {
          resolve();
        };

        utterance.onerror = (e) => {
          console.warn('[VoiceService] Speech synthesis error:', e);
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error('[VoiceService] Unexpected TTS error:', err);
        resolve();
      }
    });
  }

  /**
   * Cancel and halt all ongoing speech outputs
   */
  public static stop(): void {
    if (this.isSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch (err) {
        console.error('[VoiceService] Error cancelling speech:', err);
      }
    }
  }

  /**
   * Speaks a notification based on its priority and user settings
   * LOW -> Visual only (skip speech)
   * NORMAL -> Speech if notifSpeechEnabled is active
   * HIGH -> Speech if voiceEnabled is active
   * CRITICAL -> Always speech if voiceEnabled is active
   */
  public static speakNotification(title: string, body: string, priority: 'low' | 'normal' | 'high' | 'critical'): void {
    const prefs = this.preferences;
    if (!prefs.voiceEnabled) return;

    let shouldSpeak = false;

    if (priority === 'critical') {
      shouldSpeak = true;
    } else if (priority === 'high') {
      shouldSpeak = true;
    } else if (priority === 'normal' && prefs.notifSpeechEnabled) {
      shouldSpeak = true;
    }

    if (shouldSpeak) {
      const speechText = `Notification: ${title}. ${body}`;
      this.speak(speechText);
    }
  }

  /**
   * Announces an execution block transition
   * Example: "Next task: implement workspace navigation. You have 45 minutes."
   * Implemented with IDEMPOTENCY to prevent announcing the same task multiple times.
   */
  public static async announceTaskTransition(taskId: string, title: string, durationMinutes: number, outcome?: string, priority?: 'low' | 'medium' | 'high' | 'critical', force = false): Promise<void> {
    const prefs = this.preferences;
    if (!prefs.voiceEnabled || !prefs.taskStartAnnounceEnabled) return;

    // Idempotency check
    if (this.lastAnnouncedTaskId === taskId && !force) {
      console.log('[VoiceService] Skipping duplicate transition announcement for task:', taskId);
      return;
    }

    this.lastAnnouncedTaskId = taskId;

    const isCritical = priority === 'critical' || priority === 'high';
    const clipId = isCritical ? 'task_start_critical' : 'task_start_normal';

    const success = await this.playCustomClip(clipId);
    if (!success) {
      let text = isCritical
        ? `Attention Nick, start of critical task: ${title}. Let's secure this block. You have ${durationMinutes} minutes.`
        : `Nick, it is time to work on: ${title}. You have ${durationMinutes} minutes.`;
      if (outcome) {
        text += ` The intended outcome is to: ${outcome}.`;
      }
      this.speak(text);
    }
  }

  /**
   * Clean up the transition idempotency key (e.g., when resetting or clear-forcing)
   */
  public static resetTransitionIdempotency(): void {
    this.lastAnnouncedTaskId = null;
  }

  /**
   * Logs a voice command event to LocalStorage
   */
  public static logVoiceCommand(commandType: string, transcript: string, success: boolean, message: string): void {
    if (typeof window === 'undefined') return;
    try {
      const currentLogsStr = localStorage.getItem(LOGS_KEY);
      const logs: VoiceLogEntry[] = currentLogsStr ? JSON.parse(currentLogsStr) : [];
      
      const newEntry: VoiceLogEntry = {
        id: `log-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        commandType,
        transcript,
        success,
        message,
        timestamp: new Date().toISOString()
      };

      // Keep only last 100 logs to optimize storage
      const updatedLogs = [newEntry, ...logs].slice(0, 100);
      localStorage.setItem(LOGS_KEY, JSON.stringify(updatedLogs));
    } catch (err) {
      console.warn('[VoiceService] Failed to store voice command log:', err);
    }
  }

  /**
   * Retrieves logged voice command history
   */
  public static getVoiceLogs(): VoiceLogEntry[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(LOGS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Clears the voice command logs
   */
  public static clearVoiceLogs(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOGS_KEY);
    }
  }

  // ==============================================================================
  // REAL VOICE VAULT — CUSTOM RECORDED AUDIO ENGINE
  // ==============================================================================

  /**
   * Retrieves all custom audio clips, merging recorded base64 data with defaults
   */
  public static getCustomClips(): CustomAudioClip[] {
    const defaultClips: CustomAudioClip[] = [
      {
        id: 'idle_warning',
        name: 'Alerte Agenda Vide',
        base64Data: null,
        description: "Déclenché le matin ou en cas d'inactivité s'il n'y a aucun programme prévu pour aujourd'hui.",
        category: 'system'
      },
      {
        id: 'task_start_normal',
        name: 'Début de Tâche Standard',
        base64Data: null,
        description: "Annonce le début d'un bloc de travail normal ou à basse priorité.",
        category: 'normal'
      },
      {
        id: 'task_start_critical',
        name: 'Début de Tâche Critique',
        base64Data: null,
        description: "Annonce le lancement d'une tâche critique qui demande un engagement total.",
        category: 'critical'
      },
      {
        id: 'break_ending',
        name: 'Rappel Fin de Pause',
        base64Data: null,
        description: "Se déclenche lorsque le temps de pause est écoulé pour vous ramener au travail.",
        category: 'high'
      },
      {
        id: 'focus_violation',
        name: 'Infraction Focus Guard',
        base64Data: null,
        description: "Se déclenche instantanément si vous tentez d'ouvrir un site ou un logiciel banni.",
        category: 'critical'
      },
      {
        id: 'task_completed',
        name: 'Célébration Tâche Terminée',
        base64Data: null,
        description: "Joue un audio de récompense ou de félicitations lorsque vous marquez une tâche résolue.",
        category: 'low'
      }
    ];

    if (typeof window === 'undefined') return defaultClips;

    try {
      const stored = localStorage.getItem(AUDIO_VAULT_KEY);
      if (stored) {
        const parsedMap = JSON.parse(stored) as Record<string, string>;
        return defaultClips.map(clip => ({
          ...clip,
          base64Data: parsedMap[clip.id] || null
        }));
      }
    } catch (err) {
      console.warn('[VoiceService] Failed to load audio vault:', err);
    }

    return defaultClips;
  }

  /**
   * Save a recorded base64 audio clip to the vault
   */
  public static saveCustomClip(clipId: string, base64Data: string): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(AUDIO_VAULT_KEY);
      const currentMap = stored ? JSON.parse(stored) : {};
      currentMap[clipId] = base64Data;
      localStorage.setItem(AUDIO_VAULT_KEY, JSON.stringify(currentMap));
    } catch (err) {
      console.warn('[VoiceService] Failed to save custom clip:', err);
    }
  }

  /**
   * Delete/reset a recorded audio clip
   */
  public static deleteCustomClip(clipId: string): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(AUDIO_VAULT_KEY);
      if (stored) {
        const currentMap = JSON.parse(stored);
        delete currentMap[clipId];
        localStorage.setItem(AUDIO_VAULT_KEY, JSON.stringify(currentMap));
      }
    } catch (err) {
      console.warn('[VoiceService] Failed to delete custom clip:', err);
    }
  }

  /**
   * Play a custom clip. Returns true if played, false if fallback is needed.
   */
  public static playCustomClip(clipId: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }
      try {
        const clips = this.getCustomClips();
        const target = clips.find(c => c.id === clipId);
        if (target && target.base64Data) {
          const audio = new Audio(target.base64Data);
          audio.volume = this.preferences.volume;
          audio.onended = () => resolve(true);
          audio.onerror = (err) => {
            console.error('[VoiceService] Error playing custom audio:', err);
            resolve(false);
          };
          audio.play().catch(e => {
            console.warn('[VoiceService] Failed to autoplay custom clip:', e);
            resolve(false);
          });
        } else {
          resolve(false);
        }
      } catch (err) {
        console.warn('[VoiceService] Exception playing custom clip:', err);
        resolve(false);
      }
    });
  }

  /**
   * Trigger state-specific alert. Plays custom recorded voice if available, otherwise speaks fallback via TTS.
   */
  public static async triggerStateAlert(clipId: string, fallbackTtsText: string): Promise<void> {
    const success = await this.playCustomClip(clipId);
    if (!success) {
      // Fallback to standard Speech Synthesis
      await this.speak(fallbackTtsText, true);
    }
  }
}

// Custom interfaces for the Vault
export interface CustomAudioClip {
  id: string;
  name: string;
  base64Data: string | null;
  description: string;
  category: 'low' | 'normal' | 'high' | 'critical' | 'system';
}

const AUDIO_VAULT_KEY = 'nick_os_audio_vault';
