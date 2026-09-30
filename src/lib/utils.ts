/**
 * Utility functions for NICK OS
 */

export function cn(...classes: unknown[]): string {
  return classes.filter(Boolean).join(' ');
}

export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
}

export function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTomorrowString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysToDate(days: number, fromDateStr?: string): string {
  let d = new Date();
  if (fromDateStr) {
    const [year, month, day] = fromDateStr.split('-').map(Number);
    d = new Date(year, month - 1, day);
  }
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isDateOverdue(dateStr?: string, todayStr: string = getTodayString()): boolean {
  if (!dateStr) return false;
  return dateStr < todayStr;
}

export function isDateToday(dateStr?: string, todayStr: string = getTodayString()): boolean {
  if (!dateStr) return false;
  return dateStr === todayStr;
}

export function isDateUpcoming(dateStr?: string, todayStr: string = getTodayString()): boolean {
  if (!dateStr) return false;
  return dateStr > todayStr;
}

export function formatFriendlyDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatShortDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

export function formatMinutesToHours(minutes: number): string {
  const hrs = (minutes / 60).toFixed(1);
  return `${hrs} hrs`;
}

export function formatSecondsToTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function getCurrentTimeString(): string {
  const d = new Date();
  const hrs = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${hrs}:${mins}`;
}

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const hrs = parseInt(parts[0], 10) || 0;
  const mins = parseInt(parts[1], 10) || 0;
  return hrs * 60 + mins;
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const hrs = String(Math.floor(clamped / 60)).padStart(2, '0');
  const mins = String(clamped % 60).padStart(2, '0');
  return `${hrs}:${mins}`;
}

export function getTimeDifferenceMinutes(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return Math.max(0, end - start);
}

export function isCurrentTimeInWindow(currentTime: string, startTime: string, endTime: string): boolean {
  const current = timeToMinutes(currentTime);
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return current >= start && current < end;
}

export function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime} → ${endTime}`;
}

/**
 * Get YYYY-MM-DD date string for a specific IANA timezone (e.g. Europe/London, America/New_York)
 * Avoids assuming UTC or local machine offset equals target user timezone.
 */
export function getDateStringInTimezone(date: Date = new Date(), timeZone: string = 'Europe/London'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date); // en-CA gives YYYY-MM-DD
  } catch {
    // Fallback to standard local ISO date
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Get HH:mm time string in a specific IANA timezone
 */
export function getTimeStringInTimezone(date: Date = new Date(), timeZone: string = 'Europe/London'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return formatter.format(date);
  } catch {
    const hrs = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    return `${hrs}:${mins}`;
  }
}

/**
 * Conflict detection between two time windows (HH:mm format)
 * Returns true if the two blocks overlap in time.
 */
export function detectPlanningConflict(
  block1: { startTime: string; endTime: string },
  block2: { startTime: string; endTime: string }
): boolean {
  const start1 = timeToMinutes(block1.startTime);
  const end1 = timeToMinutes(block1.endTime);
  const start2 = timeToMinutes(block2.startTime);
  const end2 = timeToMinutes(block2.endTime);

  // Overlap occurs if start1 < end2 AND start2 < end1
  return start1 < end2 && start2 < end1;
}

/**
 * Native Web Audio discrete chime for desktop work notifications
 */
export function playNotificationChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.14); // A5
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  } catch {
    // Audio contexts may be blocked if no user interaction yet
  }
}

