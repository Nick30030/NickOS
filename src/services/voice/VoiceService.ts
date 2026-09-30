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
        const preferredVoice = voices.find(v => v.lang.startsWith(this.preferences.language));
        if (preferredVoice) {
          utterance.voice = preferredVoice;
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
  public static announceTaskTransition(taskId: string, title: string, durationMinutes: number, outcome?: string, force = false): void {
    const prefs = this.preferences;
    if (!prefs.voiceEnabled || !prefs.taskStartAnnounceEnabled) return;

    // Idempotency check
    if (this.lastAnnouncedTaskId === taskId && !force) {
      console.log('[VoiceService] Skipping duplicate transition announcement for task:', taskId);
      return;
    }

    this.lastAnnouncedTaskId = taskId;

    let text = `Nick, it is time to work on: ${title}. You have ${durationMinutes} minutes.`;
    if (outcome) {
      text += ` The intended outcome is to: ${outcome}.`;
    }

    this.speak(text);
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
}
