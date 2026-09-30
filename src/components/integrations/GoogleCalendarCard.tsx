// ==============================================================================
// NICK OS — GOOGLE CALENDAR SETTINGS INTEGRATION CARD
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { CalendarSyncService } from '../../services/calendar/CalendarSyncService';
import { CalendarAccount, GoogleCalendarItem, ExternalCalendarEvent } from '../../types/calendar';
import { Calendar, CheckCircle2, AlertCircle, RefreshCw, Unlink, Link as LinkIcon, ShieldCheck } from 'lucide-react';

export const GoogleCalendarCard: React.FC = () => {
  const [account, setAccount] = useState<CalendarAccount | null>(null);
  const [calendars, setCalendars] = useState<GoogleCalendarItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [events, setEvents] = useState<ExternalCalendarEvent[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadIntegrationState();
  }, []);

  const loadIntegrationState = async () => {
    const acc = CalendarSyncService.getAccount();
    setAccount(acc);
    if (acc && acc.status === 'connected') {
      try {
        const cals = await CalendarSyncService.listCalendars();
        setCalendars(cals);
        const sel = CalendarSyncService.getSelectedCalendarIds();
        setSelectedIds(sel);
        const evs = await CalendarSyncService.fetchCalendarEvents();
        setEvents(evs);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load Google Calendar data');
      }
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setErrorMsg(null);
    try {
      const newAcc = await CalendarSyncService.connectGoogleCalendar();
      setAccount(newAcc);
      const cals = await CalendarSyncService.listCalendars();
      setCalendars(cals);
      setSelectedIds(CalendarSyncService.getSelectedCalendarIds());
      const evs = await CalendarSyncService.fetchCalendarEvents();
      setEvents(evs);
      setSyncSuccessMsg('Google Calendar connected successfully.');
      setTimeout(() => setSyncSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'OAuth connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    CalendarSyncService.disconnect();
    setAccount(null);
    setCalendars([]);
    setEvents([]);
    setSyncSuccessMsg('Google Calendar disconnected.');
    setTimeout(() => setSyncSuccessMsg(null), 3000);
  };

  const handleToggleCalendar = (calId: string) => {
    const updated = selectedIds.includes(calId)
      ? selectedIds.filter(id => id !== calId)
      : [...selectedIds, calId];
    setSelectedIds(updated);
    CalendarSyncService.saveSelectedCalendarIds(updated);
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setErrorMsg(null);
    try {
      const evs = await CalendarSyncService.fetchCalendarEvents();
      setEvents(evs);
      setSyncSuccessMsg(`Synced successfully at ${new Date().toLocaleTimeString()}. Fetched ${evs.length} constraint events.`);
      setTimeout(() => setSyncSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card className="p-5 space-y-4 border border-neutral-800" id="google-calendar-card">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-850">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20 text-amber-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-neutral-200">
              Google Calendar Integration
            </h3>
            <p className="text-[10px] text-neutral-400 font-mono">
              External calendar constraints & execution synchronization (OAuth 2.0 secured).
            </p>
          </div>
        </div>

        {account && account.status === 'connected' ? (
          <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold rounded-full flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> CONNECTED
          </span>
        ) : (
          <span className="px-2.5 py-1 bg-neutral-800 border border-neutral-700 text-neutral-400 text-[10px] font-mono rounded-full">
            DISCONNECTED
          </span>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs font-mono text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {syncSuccessMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs font-mono text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{syncSuccessMsg}</span>
        </div>
      )}

      {(!account || account.status !== 'connected') ? (
        <div className="space-y-4 py-3">
          <p className="text-xs text-neutral-400 font-mono leading-relaxed">
            Connect your Google Calendar to synchronize meeting constraints, prevent scheduling conflicts, and optionally export approved Nick OS execution blocks to your schedule.
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={handleConnect}
              disabled={isConnecting}
              className="flex items-center gap-1.5"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              {isConnecting ? 'Authenticating OAuth...' : 'Connect Google Calendar'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Account Details */}
          <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-850 space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-neutral-400">
              <span>Account Identity:</span>
              <span className="text-neutral-200 font-bold">{account.externalAccountId}</span>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Scopes:</span>
              <span className="text-amber-400 text-[10px]">Calendar, Events, ReadOnly</span>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Connected At:</span>
              <span className="text-neutral-300">{new Date(account.connectedAt).toLocaleString()}</span>
            </div>
          </div>

          {/* Calendar List selection */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase font-bold text-neutral-500 tracking-wider">
              Select Calendars for Constraints & Sync
            </span>
            <div className="space-y-1.5">
              {calendars.map(cal => (
                <label key={cal.id} className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-lg border border-neutral-850 text-xs cursor-pointer hover:border-neutral-700 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cal.backgroundColor || '#4285F4' }} />
                    <span className="text-neutral-200 font-mono">{cal.summary}</span>
                    {cal.primary && <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded">Primary</span>}
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(cal.id)}
                    onChange={() => handleToggleCalendar(cal.id)}
                    className="rounded border-neutral-800 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 bg-neutral-900"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Upcoming constraints preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold text-neutral-500 tracking-wider">
                Fetched Constraint Events ({events.length})
              </span>
              <button
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="text-[10px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
            
            {events.length === 0 ? (
              <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-850 text-xs font-mono text-neutral-500 text-center">
                No calendar events found for today.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {events.map((ev, idx) => (
                  <div key={ev.id || idx} className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-850 flex items-start justify-between text-xs">
                    <div>
                      <div className="font-mono text-neutral-200 font-bold">{ev.summary}</div>
                      <div className="text-[10px] text-neutral-400 font-mono">
                        {ev.start?.dateTime ? new Date(ev.start.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'All Day'} 
                        {' → '}
                        {ev.end?.dateTime ? new Date(ev.end.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                      </div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 bg-neutral-900 text-amber-400 border border-neutral-800 rounded font-mono uppercase">
                      Constraint
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Disconnect Action */}
          <div className="flex items-center justify-between pt-2 border-t border-neutral-850">
            <span className="text-[10px] text-neutral-500 font-mono">
              Disconnecting revokes tokens and stops constraint sync. Nick OS execution history remains intact.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              className="text-red-400 hover:text-red-300 border-red-500/30 hover:border-red-500/50 flex items-center gap-1 shrink-0"
            >
              <Unlink className="w-3.5 h-3.5" /> Disconnect
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
