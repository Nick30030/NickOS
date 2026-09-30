import React, { useState } from 'react';
import { useExecution } from '../../context/ExecutionContext';
import { DailyReviewWizard } from '../accountability/DailyReviewWizard';
import { WeeklyReviewPanel } from '../accountability/WeeklyReviewPanel';
import { HistoricalAuditList } from '../accountability/HistoricalAuditList';
import { ShieldCheck, BarChart3, History, Calendar } from 'lucide-react';
import { getTodayString } from '../../lib/utils';

type AccountabilitySubTab = 'daily' | 'weekly' | 'history';

export const AccountabilityView: React.FC = () => {
  const {
    accountabilityRecord,
    selectedAccountabilityDate,
    loadAccountabilityForDate,
  } = useExecution();

  const [subTab, setSubTab] = useState<AccountabilitySubTab>('daily');

  const handleDateChange = (date: string) => {
    loadAccountabilityForDate(date);
    setSubTab('daily');
  };

  return (
    <div className="w-full overflow-hidden space-y-8 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800/80 w-full overflow-hidden">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-neutral-100 font-mono tracking-tight flex items-center gap-2.5 break-words">
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
              ACCOUNTABILITY & RECONCILIATION
            </h1>
            <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
              Deterministic Truth Engine
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-400 font-mono mt-1.5 leading-relaxed break-words">
            "You planned X. You actually did Y. Here is what happened." — Factual, direct, and zero self-delusion.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 bg-neutral-950 border border-neutral-800 rounded-2xl overflow-x-auto max-w-full scrollbar-none">
          <button
            type="button"
            onClick={() => setSubTab('daily')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap ${
              subTab === 'daily'
                ? 'bg-emerald-500 text-neutral-950 font-bold shadow-xs'
                : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Daily Review</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('weekly')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
              subTab === 'weekly'
                ? 'bg-emerald-500 text-neutral-950 font-bold shadow-xs'
                : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Weekly Verification</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
              subTab === 'history'
                ? 'bg-emerald-500 text-neutral-950 font-bold shadow-xs'
                : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Historical Audits</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {subTab === 'daily' && (
        <DailyReviewWizard
          currentRecord={accountabilityRecord}
          onDateChange={handleDateChange}
        />
      )}

      {subTab === 'weekly' && (
        <WeeklyReviewPanel onSelectDateForReview={handleDateChange} />
      )}

      {subTab === 'history' && (
        <HistoricalAuditList onSelectDateForReview={handleDateChange} />
      )}
    </div>
  );
};
