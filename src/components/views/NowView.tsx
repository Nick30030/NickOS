import React, { useState, useEffect } from 'react';
import { useExecution } from '../../context/ExecutionContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { PriorityBadge, CommitmentBadge, StatusBadge } from '../common/Badge';
import { PostponeTaskModal } from '../modals/PostponeTaskModal';
import { DistractionModal } from '../modals/DistractionModal';
import { FocusModeOverlay } from '../focus/FocusModeOverlay';
import { Task, TimeBlock, Project, Goal, SessionCheckIn } from '../../types/domain';
import {
  formatSecondsToTimer,
  formatMinutes,
  getCurrentTimeString,
  timeToMinutes,
  minutesToTime,
  isCurrentTimeInWindow,
  getTimeDifferenceMinutes,
  getTodayString,
  formatFriendlyDate,
} from '../../lib/utils';
import {
  Play,
  Pause,
  CheckCircle2,
  Square,
  CheckSquare,
  Crosshair,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Plus,
  Clock,
  Target,
  FolderKanban,
  Zap,
  ArrowRight,
  Flame,
  Briefcase,
  BookOpen,
  Coffee,
  Check,
  Inbox,
  Send,
  Activity,
  ShieldCheck,
  Radio,
  History,
  ShieldAlert,
  ListFilter,
} from 'lucide-react';

export const NowView: React.FC = () => {
  const { t } = useLanguage();
  const {
    tasks,
    projects,
    goals,
    timeBlocks,
    todayPlan,
    activeFocusTaskId,
    activeTask,
    activeTimeBlockId,
    activeExecutionSession,
    isTimerRunning,
    timerElapsedSeconds,
    startFocusSession,
    pauseFocusSession,
    resumeFocusSession,
    completeActiveTask,
    toggleChecklistItem,
    recordManualCheckIn,
    recordHeartbeat,
    quickCaptureThought,
    openCreateTaskModal,
    openCreateTimeBlockModal,
    setActiveTab,
  } = useExecution();

  const [currentTime, setCurrentTime] = useState(getCurrentTimeString());
  const [postponeModalOpen, setPostponeModalOpen] = useState(false);
  const [distractionModalOpen, setDistractionModalOpen] = useState(false);
  const [distractionModalType, setDistractionModalType] = useState<'distraction' | 'break' | 'blocked' | 'pause'>('distraction');
  const [quickThought, setQuickThought] = useState('');
  const [justCapturedMessage, setJustCapturedMessage] = useState<string | null>(null);
  const [showSignalTimeline, setShowSignalTimeline] = useState(false);
  const [focusModeOpen, setFocusModeOpen] = useState(false);

  const todayStr = getTodayString();

  // Tick clock every 10 seconds for instant current block alignment
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTimeString());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // --------------------------------------------------------------------------
  // DETERMINISTIC "WHAT SHOULD NICK DO RIGHT NOW?" RESOLUTION LOGIC
  // --------------------------------------------------------------------------
  
  // 1. If an active task is running via stopwatch/session, that is CURRENT
  let resolvedTask: Task | null = activeTask;
  let resolvedBlock: TimeBlock | null = null;

  if (activeTimeBlockId) {
    resolvedBlock = timeBlocks.find(b => b.id === activeTimeBlockId) || null;
  }

  // 2. If no active task is running, check scheduled time blocks for CURRENT TIME
  if (!resolvedTask) {
    const currentBlock = timeBlocks.find(b => {
      if (b.status === 'completed' || b.status === 'skipped') return false;
      return isCurrentTimeInWindow(currentTime, b.startTime, b.endTime);
    });

    if (currentBlock) {
      resolvedBlock = currentBlock;
      if (currentBlock.taskId) {
        resolvedTask = tasks.find(t => t.id === currentBlock.taskId) || null;
      }
    }
  }

  // 3. If still no current block, check for any in_progress task from tasks
  if (!resolvedTask) {
    resolvedTask = tasks.find(t => t.status === 'in_progress') || null;
    if (resolvedTask) {
      resolvedBlock = timeBlocks.find(b => b.taskId === resolvedTask?.id) || null;
    }
  }

  // 4. If still none, check for any overdue planned task scheduled for earlier today
  if (!resolvedTask) {
    const overdueBlock = timeBlocks.find(b => {
      if (b.status === 'completed' || b.status === 'skipped') return false;
      return timeToMinutes(b.endTime) <= timeToMinutes(currentTime);
    });
    if (overdueBlock) {
      resolvedBlock = overdueBlock;
      if (overdueBlock.taskId) {
        resolvedTask = tasks.find(t => t.id === overdueBlock.taskId) || null;
      }
    }
  }

  // --------------------------------------------------------------------------
  // FIND UPCOMING NEXT BLOCK & TIME REMAINING
  // --------------------------------------------------------------------------
  const currentMins = timeToMinutes(currentTime);
  const sortedFutureBlocks = timeBlocks
    .filter(b => b.status !== 'completed' && timeToMinutes(b.startTime) > currentMins)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  const nextUpcomingBlock = sortedFutureBlocks[0] || null;
  const nextUpcomingTask = nextUpcomingBlock?.taskId
    ? tasks.find(t => t.id === nextUpcomingBlock.taskId) || null
    : null;

  const minutesUntilNextBlock = nextUpcomingBlock
    ? Math.max(0, timeToMinutes(nextUpcomingBlock.startTime) - currentMins)
    : null;

  // Unscheduled or planned tasks ready to execute
  const candidateTasks = tasks.filter(
    t => t.status !== 'completed' && t.status !== 'cancelled' && t.id !== resolvedTask?.id
  );

  // Associated Project and Goal context
  const associatedProject: Project | null = resolvedTask?.projectId
    ? projects.find(p => p.id === resolvedTask.projectId) || null
    : null;

  const associatedGoal: Goal | null = resolvedTask?.goalId
    ? goals.find(g => g.id === resolvedTask.goalId) || (associatedProject?.goalId ? goals.find(g => g.id === associatedProject.goalId) || null : null)
    : null;

  // Time metrics for active cockpit
  const estimatedMins = resolvedTask?.estimatedMinutes || (resolvedBlock ? getTimeDifferenceMinutes(resolvedBlock.startTime, resolvedBlock.endTime) : 45);
  const estimatedSeconds = estimatedMins * 60;
  const remainingSeconds = Math.max(0, estimatedSeconds - timerElapsedSeconds);
  const isOvertime = timerElapsedSeconds > estimatedSeconds;
  const overtimeSeconds = timerElapsedSeconds - estimatedSeconds;

  // Handle Quick Thought Capture
  const handleQuickCaptureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickThought.trim()) return;

    try {
      const item = await quickCaptureThought(quickThought.trim());
      setJustCapturedMessage(`"${item.title}" stored in Inbox — focus kept!`);
      setQuickThought('');
      setTimeout(() => setJustCapturedMessage(null), 3500);
    } catch (err) {
      console.error('Failed to capture thought:', err);
    }
  };

  const openDistractionPrompt = (type: 'distraction' | 'break' | 'blocked' | 'pause') => {
    setDistractionModalType(type);
    setDistractionModalOpen(true);
  };

  return (
    <div className="w-full overflow-hidden max-w-4xl mx-auto space-y-10 pb-16 animate-in fade-in duration-150">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-6 w-full overflow-hidden">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Crosshair className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-100 flex items-center gap-2 break-words">
              {t('nowMode', 'NOW Mode')}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-0.5 break-words">
              {t('deterministicSourceOfTruth', 'Deterministic source of truth')}. {t('currentTime', 'Current time')}: <strong className="text-emerald-400 font-mono">{currentTime}</strong>
            </p>
          </div>
        </div>

        {/* Quick Nav / Anti-Dispersion Trigger */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setFocusModeOpen(true)}
            className="bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-bold shadow-lg shadow-emerald-500/20 whitespace-nowrap"
            icon={<Crosshair className="w-3.5 h-3.5 text-neutral-950" />}
          >
            {t('startFocus', 'Enter Focus Mode')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setActiveTab('today')}
            icon={<Clock className="w-3.5 h-3.5 text-neutral-400" />}
            className="whitespace-nowrap"
          >
            {t('today', 'Today')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setActiveTab('analytics')}
            icon={<Activity className="w-3.5 h-3.5 text-neutral-400" />}
            className="whitespace-nowrap"
          >
            {t('analytics', 'Analytics')}
          </Button>
        </div>
      </div>

      {/* 2. IF ACTIVE OR SCHEDULED TASK EXISTS */}
      {resolvedTask ? (
        <div className="space-y-8">
          {/* Main NOW Execution Card */}
          <div className={`rounded-2xl border transition-all ${
            isTimerRunning
              ? 'border-emerald-500/70 bg-neutral-900/90 ring-1 ring-emerald-500/30 shadow-2xl shadow-emerald-950/40'
              : 'border-neutral-800 bg-neutral-900/70'
          }`}>
            {/* Top Status Strip */}
            <div className="px-6 sm:px-8 py-4 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3 bg-neutral-950/60 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full ${isTimerRunning ? 'bg-emerald-400 animate-ping' : 'bg-neutral-500'}`} />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                  {isTimerRunning ? t('executionInProgress', 'EXECUTION IN PROGRESS') : activeExecutionSession?.status === 'paused' ? t('executionPaused', 'EXECUTION PAUSED') : t('scheduledForNow', 'SCHEDULED FOR NOW')}
                </span>
                {activeExecutionSession && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                    Session: {activeExecutionSession.id.slice(0, 8)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <PriorityBadge priority={resolvedTask.priority} size="sm" />
                <CommitmentBadge level={resolvedTask.commitmentLevel} size="sm" />
                <StatusBadge status={resolvedTask.status} size="sm" />
              </div>
            </div>

            <div className="p-7 md:p-10 space-y-8">
              {/* CURRENT TASK TITLE */}
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 font-bold block mb-1.5">
                  {t('currentTask', 'CURRENT TASK')}
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-neutral-100 tracking-tight break-words">
                  {resolvedTask.title}
                </h2>
              </div>

              {/* WHY / STRATEGIC CONTEXT & TIME ESTIMATE GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-5 rounded-2xl bg-neutral-950/70 border border-neutral-800">
                {/* WHY: Goal & Project Context */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-emerald-400" />
                    WHY / CONTEXT
                  </span>
                  <div>
                    {associatedProject ? (
                      <p className="text-xs sm:text-sm font-semibold text-neutral-200 truncate">
                        {associatedProject.name}
                      </p>
                    ) : (
                      <p className="text-xs text-neutral-400 italic">General Execution</p>
                    )}
                    {associatedGoal && (
                      <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                        Goal: {associatedGoal.title}
                      </p>
                    )}
                  </div>
                </div>

                {/* TIME: Scheduled Window */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    SCHEDULED TIME
                  </span>
                  <p className="text-xs sm:text-sm font-mono font-bold text-neutral-200">
                    {resolvedBlock
                      ? `${resolvedBlock.startTime} → ${resolvedBlock.endTime}`
                      : resolvedTask.scheduledStartTime
                      ? `${resolvedTask.scheduledStartTime} → ${resolvedTask.scheduledEndTime || 'Flexible'}`
                      : 'Scheduled for Today'}
                  </p>
                  <p className="text-[11px] text-neutral-400 font-mono">
                    Est. Duration: {estimatedMins} mins
                  </p>
                </div>

                {/* ESTIMATE / TIMER STATS */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    EXECUTION TIMER
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-mono font-bold text-neutral-100">
                      {formatSecondsToTimer(timerElapsedSeconds)}
                    </span>
                    {isOvertime ? (
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold border border-rose-500/40">
                        +{formatSecondsToTimer(overtimeSeconds)} OT
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono text-neutral-400">
                        ({Math.ceil(remainingSeconds / 60)}m left)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* OUTCOME / DELIVERABLE */}
              <div className="space-y-2 p-5 rounded-2xl bg-neutral-950/40 border border-neutral-800">
                <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold tracking-wider block">
                  DESIRED OUTCOME / DELIVERABLE
                </span>
                <p className="text-sm text-neutral-300 leading-relaxed">
                  {resolvedTask.description ||
                    'Execute this block with full cognitive immersion. Produce a tangible milestone.'}
                </p>
              </div>

              {/* CHECKLIST STEPS (IF ANY) */}
              {resolvedTask.checklist && resolvedTask.checklist.length > 0 && (
                <div className="space-y-3">
                  <span className="text-xs font-mono font-bold uppercase text-neutral-400">
                    Execution Steps ({resolvedTask.checklist.filter(c => c.done).length}/{resolvedTask.checklist.length})
                  </span>
                  <div className="space-y-2">
                    {resolvedTask.checklist.map(item => (
                      <div
                        key={item.id}
                        onClick={() => toggleChecklistItem(resolvedTask!.id, item.id)}
                        className={`flex items-center gap-3.5 p-3 rounded-xl border transition-all cursor-pointer ${
                          item.done
                            ? 'border-neutral-800 bg-neutral-950/40 text-neutral-400 line-through'
                            : 'border-neutral-800 bg-neutral-950 text-neutral-200 hover:border-neutral-700'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          item.done ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-neutral-600'
                        }`}>
                          {item.done && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="text-xs sm:text-sm font-medium">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MANUAL SIGNALS & CHECK-IN BAR (EXPLICIT HUMAN VERIFICATION) */}
              <div className="p-5 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-emerald-400" />
                    MANUAL EXECUTION CHECK-INS & SIGNALS
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500">
                    Reliable Source of Truth
                  </span>
                </div>

                <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => recordManualCheckIn('working', 'Deep focus verified')}
                    className="p-3 rounded-xl bg-neutral-900 hover:bg-emerald-950/40 hover:border-emerald-500/50 border border-neutral-800 text-[11px] font-mono text-emerald-300 font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="whitespace-nowrap">In Deep Flow</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openDistractionPrompt('distraction')}
                    className="p-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[11px] font-mono text-neutral-300 hover:text-amber-400 font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="whitespace-nowrap">I Was Distracted</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openDistractionPrompt('break')}
                    className="p-3 rounded-xl bg-neutral-900 hover:bg-blue-950/40 hover:border-blue-500/50 border border-neutral-800 text-[11px] font-mono text-blue-300 font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Coffee className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="whitespace-nowrap">Take Break</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openDistractionPrompt('blocked')}
                    className="p-3 rounded-xl bg-neutral-900 hover:bg-rose-950/40 hover:border-rose-500/50 border border-neutral-800 text-[11px] font-mono text-rose-300 font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="whitespace-nowrap">I'm Blocked</span>
                  </button>
                </div>
              </div>

              {/* PRIMARY COCKPIT ACTIONS */}
              <div className="pt-6 border-t border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {!isTimerRunning ? (
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => {
                        if (activeExecutionSession && activeExecutionSession.status === 'paused') {
                          resumeFocusSession();
                        } else {
                          startFocusSession(resolvedTask!.id, resolvedBlock?.id);
                        }
                      }}
                      icon={<Play className="w-5 h-5 fill-current" />}
                      className="px-6 py-3 text-base shadow-lg shadow-emerald-500/20 whitespace-nowrap"
                    >
                      {activeExecutionSession?.status === 'paused' ? t('resumeSession', 'RESUME FOCUS') : t('startFocus', 'START FOCUS')}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={() => openDistractionPrompt('pause')}
                      icon={<Pause className="w-5 h-5 fill-current text-emerald-400" />}
                      className="px-6 py-3 whitespace-nowrap"
                    >
                      {t('pauseSession', 'Pause Focus')}
                    </Button>
                  )}

                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => completeActiveTask()}
                    icon={<CheckCircle2 className="w-5 h-5 text-neutral-950" />}
                    className="bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-bold border-emerald-400 whitespace-nowrap"
                  >
                    {t('finishTask', 'Complete Task')}
                  </Button>
                </div>

                <div className="flex items-center justify-center sm:justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPostponeModalOpen(true)}
                    icon={<RotateCcw className="w-4 h-4 text-neutral-400" />}
                    className="whitespace-nowrap"
                  >
                    {t('postponeTask', 'Postpone / Defer')}
                  </Button>
                </div>
              </div>
            </div>

            {/* Bottom Heartbeat & Transparency Bar */}
            <div className="px-6 sm:px-8 py-3.5 bg-neutral-950 border-t border-neutral-850 rounded-b-2xl flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-neutral-400">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isTimerRunning ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'}`} />
                <span>
                  {isTimerRunning
                    ? `Heartbeat active (${activeExecutionSession?.heartbeatCount || 1} pulses logged)`
                    : 'Session paused / awaiting resumption'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowSignalTimeline(!showSignalTimeline)}
                className="text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <History className="w-3 h-3" />
                <span>{showSignalTimeline ? 'Hide Signal Timeline' : 'View Recorded Signals'}</span>
              </button>
            </div>

            {/* Expandable Signal Timeline for Current Session */}
            {showSignalTimeline && activeExecutionSession && (
              <div className="px-6 sm:px-8 py-5 bg-neutral-950 border-t border-neutral-800 text-xs font-mono space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <span className="font-bold text-neutral-300">Session Signal Trail</span>
                  <span className="text-[10px] text-neutral-400">Started: {activeExecutionSession.startTime.slice(11, 19)} UTC</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <span className="text-[10px]">•</span>
                    <span>Session initiated</span>
                    <span className="text-[10px] text-neutral-400">{activeExecutionSession.startTime.slice(11, 16)}</span>
                  </div>

                  {activeExecutionSession.checkIns?.map(chk => (
                    <div key={chk.id} className="flex items-center gap-2 text-neutral-300">
                      <span className="text-[10px]">•</span>
                      <span className="capitalize font-semibold text-emerald-300">[{chk.type}]</span>
                      <span>{chk.note}</span>
                      <span className="text-[10px] text-neutral-400">{chk.timestamp.slice(11, 16)}</span>
                    </div>
                  ))}

                  {activeExecutionSession.pauses?.map(p => (
                    <div key={p.id} className="flex items-center gap-2 text-rose-300">
                      <span className="text-[10px]">•</span>
                      <span>Paused ({p.category}): {p.reason}</span>
                      <span className="text-[10px] text-neutral-400">
                        {p.pausedAt.slice(11, 16)} {p.resumedAt ? `→ Resumed ${p.resumedAt.slice(11, 16)}` : '(Active pause)'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : resolvedBlock ? (
        /* 3. SCHEDULED ROUTINE BLOCK (e.g. Spirituality, Exercise, Lunch) WITHOUT LINKED TASK */
        <div className="space-y-8">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-7 md:p-10 space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <span className="text-xs font-mono font-bold uppercase text-emerald-400">
                CURRENT SCHEDULED BLOCK — ROUTINE / PERSONAL
              </span>
              <span className="text-xs font-mono text-neutral-400">
                {resolvedBlock.startTime} → {resolvedBlock.endTime}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 font-bold block mb-1">
                CURRENT ROUTINE BLOCK
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-neutral-100">
                {resolvedBlock.title}
              </h2>
            </div>

            {resolvedBlock.notes && (
              <p className="text-sm text-neutral-300 p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                {resolvedBlock.notes}
              </p>
            )}

            <div className="flex items-center gap-3 pt-4 border-t border-neutral-800">
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  useExecution().updateTimeBlock(resolvedBlock!.id, {
                    status: 'completed',
                    actualEnd: getCurrentTimeString(),
                  });
                }}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Mark Block Finished
              </Button>

              <Button
                variant="secondary"
                size="md"
                onClick={() => openCreateTimeBlockModal({ ...resolvedBlock! })}
                icon={<Plus className="w-4 h-4" />}
              >
                Attach Actionable Task
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* 4. NO ACTIVE TASK SCHEDULED RIGHT NOW */
        <div className="space-y-8">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-7 md:p-10 space-y-6">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-neutral-100">
                  No Block Scheduled at {currentTime}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400">
                  Nick is ahead of schedule or between planned execution windows.
                </p>
              </div>
            </div>

            {/* What is Coming Next Box */}
            {nextUpcomingBlock ? (
              <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    COMING UP NEXT TODAY
                  </span>
                  <span className="text-xs font-mono font-bold text-neutral-200">
                    Starts at {nextUpcomingBlock.startTime} ({minutesUntilNextBlock} minutes from now)
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-base font-bold text-neutral-100">
                      {nextUpcomingBlock.title}
                    </h4>
                    {nextUpcomingTask && (
                      <p className="text-xs text-neutral-400 mt-1">
                        Task: {nextUpcomingTask.title} ({nextUpcomingTask.estimatedMinutes}m)
                      </p>
                    )}
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (nextUpcomingTask) {
                        startFocusSession(nextUpcomingTask.id, nextUpcomingBlock.id);
                      } else {
                        startFocusSession(candidateTasks[0]?.id || '', nextUpcomingBlock.id);
                      }
                    }}
                    icon={<Play className="w-3.5 h-3.5 fill-current" />}
                  >
                    Start Next Block Early
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-neutral-950/60 border border-neutral-800 text-xs font-mono text-neutral-400 text-center">
                All scheduled time blocks for today have been completed or day plan is clear.
              </div>
            )}

            {/* Quick Pick / Start Any Unscheduled Task */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono font-bold uppercase text-neutral-400">
                  Or Start Working on an Available Task:
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openCreateTaskModal({ scheduledDate: todayStr, status: 'planned' })}
                  icon={<Plus className="w-3 h-3" />}
                >
                  Create Task
                </Button>
              </div>

              {candidateTasks.length === 0 ? (
                <p className="text-xs text-neutral-500 font-mono">No pending tasks in backlog.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                  {candidateTasks.slice(0, 6).map(t => (
                    <div
                      key={t.id}
                      onClick={() => startFocusSession(t.id)}
                      className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800/80 hover:border-emerald-500/60 transition-all cursor-pointer flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <PriorityBadge priority={t.priority} size="sm" />
                          <span className="text-[10px] font-mono text-neutral-400">
                            {t.estimatedMinutes}m
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-neutral-200 truncate">{t.title}</p>
                      </div>

                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Play className="w-3 h-3 text-emerald-400" />}
                      >
                        Start
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. ANTI-DISPERSION INBOX / QUICK CAPTURE PANEL */}
      <div className="p-6 md:p-7 rounded-2xl bg-neutral-950 border border-neutral-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono font-bold uppercase text-neutral-200">
              Anti-Dispersion Inbox Quick Capture
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Non-disruptive capture
          </span>
        </div>

        {justCapturedMessage && (
          <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{justCapturedMessage}</span>
          </div>
        )}

        <form onSubmit={handleQuickCaptureSubmit} className="flex gap-3">
          <input
            type="text"
            placeholder="Intrusive thought? e.g. 'Research new authentication library'..."
            value={quickThought}
            onChange={e => setQuickThought(e.target.value)}
            className="flex-1 rounded-xl bg-neutral-900 border border-neutral-800 px-4 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
          />
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            disabled={!quickThought.trim()}
            icon={<Send className="w-3.5 h-3.5 text-emerald-400" />}
          >
            Capture
          </Button>
        </form>
      </div>

      {/* Postpone Task Modal */}
      <PostponeTaskModal
        isOpen={postponeModalOpen}
        onClose={() => setPostponeModalOpen(false)}
        task={resolvedTask}
      />

      {/* Distraction / Interruption Modal */}
      <DistractionModal
        isOpen={distractionModalOpen}
        onClose={() => setDistractionModalOpen(false)}
        type={distractionModalType}
      />

      {/* Focus Mode Immersive Overlay */}
      <FocusModeOverlay
        isOpen={focusModeOpen}
        onClose={() => setFocusModeOpen(false)}
      />
    </div>
  );
};
