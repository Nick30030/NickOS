// ==============================================================================
// NICK OS — GOOGLE TASKS SETTINGS INTEGRATION CARD
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { GoogleTasksService } from '../../services/tasks/GoogleTasksService';
import { GoogleTasksAccount, GoogleTaskList, ExternalGoogleTask } from '../../types/tasks-sync';
import { CheckSquare, CheckCircle2, AlertCircle, RefreshCw, Unlink, Link as LinkIcon, ShieldCheck, Download } from 'lucide-react';

export const GoogleTasksCard: React.FC = () => {
  const [account, setAccount] = useState<GoogleTasksAccount | null>(null);
  const [lists, setLists] = useState<GoogleTaskList[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tasks, setTasks] = useState<ExternalGoogleTask[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    const acc = GoogleTasksService.getAccount();
    setAccount(acc);
    if (acc && acc.status === 'connected') {
      try {
        const fetchedLists = await GoogleTasksService.listTaskLists();
        setLists(fetchedLists);
        setSelectedIds(GoogleTasksService.getSelectedTaskListIds());
        const fetchedTasks = await GoogleTasksService.fetchGoogleTasks();
        setTasks(fetchedTasks);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load Google Tasks integration data.');
      }
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setErrorMsg(null);
    try {
      const newAcc = await GoogleTasksService.connectGoogleTasks();
      setAccount(newAcc);
      const fetchedLists = await GoogleTasksService.listTaskLists();
      setLists(fetchedLists);
      setSelectedIds(GoogleTasksService.getSelectedTaskListIds());
      const fetchedTasks = await GoogleTasksService.fetchGoogleTasks();
      setTasks(fetchedTasks);
      setSuccessMsg('Google Tasks connected successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'OAuth authentication failed.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    GoogleTasksService.disconnect();
    setAccount(null);
    setLists([]);
    setTasks([]);
    setSuccessMsg('Google Tasks disconnected.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleToggleList = (listId: string) => {
    const updated = selectedIds.includes(listId)
      ? selectedIds.filter(id => id !== listId)
      : [...selectedIds, listId];
    setSelectedIds(updated);
    GoogleTasksService.saveSelectedTaskListIds(updated);
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setErrorMsg(null);
    try {
      const fetchedTasks = await GoogleTasksService.fetchGoogleTasks();
      setTasks(fetchedTasks);
      setSuccessMsg(`Synced successfully at ${new Date().toLocaleTimeString()}. Fetched ${fetchedTasks.length} tasks.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card className="p-5 space-y-4 border border-neutral-800" id="google-tasks-card">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-850">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 text-blue-400">
            <CheckSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-neutral-200">
              Google Tasks Integration
            </h3>
            <p className="text-[10px] text-neutral-400 font-mono">
              External task sync layer & optional Inbox import (OAuth 2.0 secured).
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

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs font-mono text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {(!account || account.status !== 'connected') ? (
        <div className="space-y-4 py-3">
          <p className="text-xs text-neutral-400 font-mono leading-relaxed">
            Connect your Google Tasks account to synchronize external lists, import items into your Nick OS Inbox, and selectively export execution tasks.
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
              {isConnecting ? 'Authenticating OAuth...' : 'Connect Google Tasks'}
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
              <span className="text-blue-400 text-[10px]">Google Tasks, ReadOnly</span>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Connected At:</span>
              <span className="text-neutral-300">{new Date(account.connectedAt).toLocaleString()}</span>
            </div>
          </div>

          {/* Task Lists Selection */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase font-bold text-neutral-500 tracking-wider">
              Select Task Lists to Synchronize
            </span>
            <div className="space-y-1.5">
              {lists.map(list => (
                <label key={list.id} className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-lg border border-neutral-850 text-xs cursor-pointer hover:border-neutral-700 transition-colors">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-neutral-200 font-mono">{list.title}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(list.id)}
                    onChange={() => handleToggleList(list.id)}
                    className="rounded border-neutral-800 text-blue-500 focus:ring-blue-500 h-3.5 w-3.5 bg-neutral-900"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Fetched Google Tasks Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold text-neutral-500 tracking-wider">
                Fetched Google Tasks ({tasks.length})
              </span>
              <button
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="text-[10px] font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-850 text-xs font-mono text-neutral-500 text-center">
                No Google Tasks found in selected lists.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {tasks.map((t, idx) => (
                  <div key={t.id || idx} className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-850 flex items-start justify-between text-xs">
                    <div>
                      <div className="font-mono text-neutral-200 font-bold">{t.title}</div>
                      {t.notes && <div className="text-[10px] text-neutral-400 font-mono truncate max-w-xs">{t.notes}</div>}
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 bg-neutral-900 text-blue-400 border border-neutral-800 rounded font-mono uppercase">
                      {t.status === 'completed' ? 'Completed' : 'Active'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Disconnect Action */}
          <div className="flex items-center justify-between pt-2 border-t border-neutral-850">
            <span className="text-[10px] text-neutral-500 font-mono">
              Disconnecting revokes tokens and stops tasks sync. Nick OS execution history remains intact.
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
