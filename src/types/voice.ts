// ==============================================================================
// NICK OS — VOICE AND SPEECH TYPE DEFINITIONS
// ==============================================================================

export interface VoicePreferences {
  voiceEnabled: boolean;
  notifSpeechEnabled: boolean;
  taskStartAnnounceEnabled: boolean;
  accountabilityAnnounceEnabled: boolean;
  aiAnnounceEnabled: boolean;
  volume: number; // 0.0 to 1.0
  rate: number; // 0.5 to 2.0
  pitch: number; // 0.5 to 2.0
  language: string; // e.g., 'en-US' or 'en-GB'
}

export type MicrophoneState = 'idle' | 'listening' | 'processing' | 'success' | 'error';

export interface VoiceLogEntry {
  id: string;
  commandType: string; // e.g., 'WHATS_NEXT', 'START_ACTIVE_TASK', 'UNKNOWN'
  transcript: string;
  success: boolean;
  message: string;
  timestamp: string;
}
