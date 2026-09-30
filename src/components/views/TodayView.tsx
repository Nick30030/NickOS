import React, { useState, useEffect } from 'react';
import { useExecution } from '../../context/ExecutionContext';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { PriorityBadge, CommitmentBadge, StatusBadge } from '../common/Badge';
import { ProgressBar } from '../common/ProgressBar';
import { EmptyState } from '../common/EmptyState';
import { PostponeTaskModal } from '../modals/PostponeTaskModal';
import { TimeBlock, Task, TimeBlockType } from '../../types/domain';
import {
  formatMinutes,
  formatFriendlyDate,
  getTodayString,
  getTomorrowString,
  addDaysToDate,
  getCurrentTimeString,
  timeToMinutes,
  minutesToTime,
  getTimeDifferenceMinutes,
  isCurrentTimeInWindow,
} from '../../lib/utils';
import {
  Calendar,
  Clock,
  Play,
  Pause,
  CheckCircle2,
  Plus,
  Zap,
  Edit2,
  Trash2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Check,
  CheckSquare,
  FolderKanban,
  Target,
  ListTodo,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Sparkles,
  Flame,
  BookOpen,
  Briefcase,
  Dumbbell,
  Coffee,
  Users,
  User,
  MoreHorizontal,
  Layers,
  ArrowDownCircle,
} from 'lucide-react';

export const TodayView: React.FC = () => {
  const {
    tasks,
    projects,
    goals,
    todayPlan,
    currentPlannerPlan,
    selectedPlannerDate,
    setSelectedPlannerDate,
    timeBlocks,
    activeFocusTaskId,
    isTimerRunning,
    startFocusSession,
    pauseFocusSession,
    resumeFocusSession,
    completeActiveTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    toggleChecklistItem,
    createTimeBlock,
    updateTimeBlock,
    deleteTimeBlock,
    shiftTimeBlock,
    openCreateTimeBlockModal,
    openEditTimeBlockModal,
    openCreateTaskModal,
    openEditTaskModal,
    setIsPlanDayModalOpen,
    setActiveTab,
  } = useExecution();

  const [postponeTaskTarget, setPostponeTaskTarget] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'blocks'>('timeline');
  const [currentTime, setCurrentTime] = useState(getCurrentTimeString());

  const todayStr = getTodayString();
  const tomorrowStr = getTomorrowString();
  const activeDate = selectedPlannerDate || todayStr;
  const isToday = activeDate === todayStr;
  const isTomorrow = activeDate === tomorrowStr;
  const isFuture = activeDate > todayStr;
  const isPast = activeDate < todayStr;
  const friendlyDate = formatFriendlyDate(activeDate);
  const activePlan = isToday ? todayPlan : (currentPlannerPlan || todayPlan);

  const handlePrevDay = () => setSelectedPlannerDate(addDaysToDate(-1, activeDate));
  const handleNextDay = () => setSelectedPlannerDate(addDaysToDate(1, activeDate));
  const handleJumpToToday = () => setSelectedPlannerDate(todayStr);
  const handleJumpToTomorrow = () => setSelectedPlannerDate(tomorrowStr);

  // Keep live time ticking every 30 seconds for accurate current-block highlighting
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTimeString());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Sorted Time Blocks for active date
  const sortedTimeBlocks = [...timeBlocks].sort((a, b) => {
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });

  // Calculate planned vs actual minutes from time blocks and tasks
  const totalPlannedBlockMinutes = sortedTimeBlocks.reduce(
    (sum, b) => sum + getTimeDifferenceMinutes(b.startTime, b.endTime),
    0
  );

  const completedBlocks = sortedTimeBlocks.filter(b => b.status === 'completed');
  const completedBlockMinutes = completedBlocks.reduce(
    (sum, b) => sum + getTimeDifferenceMinutes(b.startTime, b.endTime),
    0
  );

  // Unscheduled tasks for active date (tasks without an active time block)
  const scheduledTaskIds = new Set(sortedTimeBlocks.map(b => b.taskId).filter(Boolean));
  const unscheduledTasks = tasks.filter(
    t =>
      t.status !== 'completed' &&
      t.status !== 'cancelled' &&
      !scheduledTaskIds.has(t.id) &&
      (t.scheduledDate === activeDate || (!t.scheduledDate && t.status === 'planned'))
  );

  const completedTodayTasks = tasks.filter(
    t => t.status === 'completed' && (t.scheduledDate === activeDate || (!t.scheduledDate && isToday))
  );

  // Helper for Category Badges
  const getBlockCategoryBadge = (type: TimeBlockType) => {
    const map: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
      deep_work: { label: 'Deep Work', icon: <Briefcase className="w-3 h-3" />, color: 'bg-blue-500/10 text-blue-300 border-blue-500/30' },
      shallow_work: { label: 'Shallow Work', icon: <Clock className="w-3 h-3" />, color: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' },
      routine: { label: 'Routine', icon: <Clock className="w-3 h-3" />, color: 'bg-neutral-800 text-neutral-300 border-neutral-700' },
      spirituality: { label: 'Spirituality', icon: <Flame className="w-3 h-3" />, color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
      learning: { label: 'Learning', icon: <BookOpen className="w-3 h-3" />, color: 'bg-purple-500/10 text-purple-300 border-purple-500/30' },
      exercise: { label: 'Exercise', icon: <Dumbbell className="w-3 h-3" />, color: 'bg-teal-500/10 text-teal-300 border-teal-500/30' },
      buffer: { label: 'Buffer', icon: <Clock className="w-3 h-3" />, color: 'bg-neutral-800 text-neutral-400 border-neutral-700' },
      break: { label: 'Break', icon: <Coffee className="w-3 h-3" />, color: 'bg-neutral-800 text-neutral-300 border-neutral-700' },
      rest: { label: 'Rest / Meal', icon: <Coffee className="w-3 h-3" />, color: 'bg-neutral-800 text-neutral-300 border-neutral-700' },
      admin: { label: 'Admin', icon: <Clock className="w-3 h-3" />, color: 'bg-neutral-800 text-neutral-300 border-neutral-700' },
      social: { label: 'Social', icon: <Users className="w-3 h-3" />, color: 'bg-pink-500/10 text-pink-300 border-pink-500/30' },
      personal: { label: 'Personal', icon: <User className="w-3 h-3" />, color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' },
      other: { label: 'Other', icon: <MoreHorizontal className="w-3 h-3" />, color: 'bg-neutral-800 text-neutral-400 border-neutral-700' },
    };
    const config = map[type] || map.deep_work;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border ${config.color}`}>
        {config.icon}
        <span>{config.label}</span>
      </span>
    );
  };

  // Shift block by +/- minutes
  const handleShiftBlock = async (block: TimeBlock, deltaMinutes: number) => {
    const startMins = timeToMinutes(block.startTime);
    const endMins = timeToMinutes(block.endTime);
    const duration = endMins - startMins;

    const newStartMins = Math.max(0, startMins + deltaMinutes);
    const newEndMins = Math.min(23 * 60 + 59, newStartMins + duration);

    await shiftTimeBlock(block.id, minutesToTime(newStartMins), minutesToTime(newEndMins));
  };

  // Schedule an unscheduled task into a block
  const handleScheduleTask = (task: Task) => {
    // Find next available slot or default from current time
    let nextStart = isToday ? currentTime : '09:00';
    if (sortedTimeBlocks.length > 0) {
      const lastBlock = sortedTimeBlocks[sortedTimeBlocks.length - 1];
      nextStart = lastBlock.endTime;
    }
    const startMins = timeToMinutes(nextStart);
    const duration = task.estimatedMinutes || 45;
    const nextEnd = minutesToTime(Math.min(23 * 60 + 59, startMins + duration));

    // Update task's scheduledDate to match the active planner date if not set
    if (task.scheduledDate !== activeDate) {
      updateTask(task.id, { scheduledDate: activeDate, status: 'planned' });
    }

    openCreateTimeBlockModal({
      dailyPlanId: activePlan?.id || `plan-${activeDate}`,
      title: task.title,
      taskId: task.id,
      blockType: 'deep_work',
      startTime: nextStart,
      endTime: nextEnd,
      notes: task.description,
    });
  };

  // Auto-generate standard schedule structure if planner is empty
  const handleSeedDefaultDaySchedule = async () => {
    const planId = activePlan?.id || `plan-${activeDate}`;
    const defaultSchedule: Omit<TimeBlock, 'id' | 'createdAt' | 'updatedAt'>[] = [
      { dailyPlanId: planId, title: 'Spirituality & Mindset', blockType: 'spirituality', startTime: '08:00', endTime: '08:30', status: 'planned' },
      { dailyPlanId: planId, title: 'Learning & Technical Research', blockType: 'learning', startTime: '09:00', endTime: '10:00', status: 'planned' },
      { dailyPlanId: planId, title: 'Business OS Deep Architecture', blockType: 'deep_work', startTime: '10:00', endTime: '11:30', status: 'planned' },
      { dailyPlanId: planId, title: 'Lunch & Cognitive Reset', blockType: 'rest', startTime: '12:00', endTime: '13:00', status: 'planned' },
      { dailyPlanId: planId, title: 'Business OS Execution & Core Features', blockType: 'deep_work', startTime: '14:00', endTime: '15:30', status: 'planned' },
      { dailyPlanId: planId, title: 'Physical Health & Exercise', blockType: 'exercise', startTime: '16:00', endTime: '17:00', status: 'planned' },
    ];

    for (const block of defaultSchedule) {
      await createTimeBlock(block);
    }
  };

  return (
    <div className="w-full overflow-hidden space-y-8 max-w-7xl mx-auto pb-16">
      {/* 1. Header & Date Switcher Bar */}
      <div className="flex flex-col gap-4 border-b border-neutral-800/80 pb-6 w-full overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-neutral-100 flex items-center gap-2.5 break-words">
                <Calendar className="w-6 h-6 text-emerald-400 shrink-0" />
                Daily Planner & Timeline
              </h1>

              {/* Day Context Pill */}
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border flex items-center gap-1.5 whitespace-nowrap ${
                  isToday
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : isTomorrow
                    ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                    : isFuture
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                    : 'bg-neutral-800/80 text-neutral-400 border-neutral-700/60'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isToday
                      ? 'bg-emerald-400 animate-pulse'
                      : isTomorrow
                      ? 'bg-sky-400'
                      : 'bg-neutral-400'
                  }`}
                />
                {friendlyDate}
                {isToday && ' (Today)'}
                {isTomorrow && ' (Tomorrow)'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1.5 leading-relaxed break-words">
              {isToday
                ? 'Nick owns the schedule. Transform commitments into an actionable chronological timeline.'
                : isTomorrow
                ? "Advance Planning Mode: Sequence tomorrow's schedule and lock commitments ahead of time."
                : isFuture
                ? `Future Schedule Planning: Structuring roadmap and time blocks for ${friendlyDate}.`
                : `Historical Archive: Reviewing schedule and execution records for ${friendlyDate}.`}
            </p>
          </div>

          {/* Quick Date Switcher Controls */}
          <div className="flex flex-wrap items-center gap-2 bg-neutral-950/80 p-1.5 rounded-xl border border-neutral-800/90 shadow-xs">
            <button
              onClick={handlePrevDay}
              title="Previous Day"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={handleJumpToToday}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                isToday
                  ? 'bg-emerald-500 text-neutral-950 font-bold shadow-xs'
                  : 'text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800'
              }`}
            >
              Today
            </button>

            <button
              onClick={handleJumpToTomorrow}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                isTomorrow
                  ? 'bg-sky-500 text-neutral-950 font-bold shadow-xs'
                  : 'text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800'
              }`}
            >
              Tomorrow
            </button>

            <button
              onClick={handleNextDay}
              title="Next Day"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Direct Date Picker */}
            <div className="relative flex items-center border-l border-neutral-800 pl-2">
              <input
                type="date"
                value={activeDate}
                onChange={e => e.target.value && setSelectedPlannerDate(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs font-mono rounded-lg px-2 py-1 focus:outline-hidden focus:border-emerald-500/50 cursor-pointer"
                title="Jump to date"
              />
            </div>
          </div>
        </div>

        {/* View Mode & Action Buttons Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                viewMode === 'timeline'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode('blocks')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                viewMode === 'blocks'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Block Cards
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isToday && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleJumpToToday}
                icon={<RotateCcw className="w-3.5 h-3.5 text-neutral-400" />}
              >
                Back to Today
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsPlanDayModalOpen(true)}
              icon={<Sparkles className="w-3.5 h-3.5 text-emerald-400" />}
            >
              {isTomorrow ? "Plan Tomorrow's Program" : isToday ? 'Review Commitments' : `Plan ${formatFriendlyDate(activeDate)}`}
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                openCreateTimeBlockModal({
                  dailyPlanId: activePlan?.id || `plan-${activeDate}`,
                  startTime: isToday ? currentTime : '09:00',
                  endTime: minutesToTime(timeToMinutes(isToday ? currentTime : '09:00') + 60),
                })
              }
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Time Block
            </Button>
          </div>
        </div>

        {/* Advance Planning / Tomorrow Notice Banner */}
        {isTomorrow && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-sky-950/30 border border-sky-500/30 text-sky-200 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <CalendarDays className="w-5 h-5 text-sky-400 shrink-0" />
              <div>
                <p className="font-semibold text-neutral-100">
                  Programming Tomorrow's Schedule ({friendlyDate})
                </p>
                <p className="text-neutral-400 text-[11px] mt-0.5">
                  You are sequencing tomorrow's time blocks and commitments in advance. When tomorrow arrives, this becomes your live execution cockpit.
                </p>
              </div>
            </div>
            {sortedTimeBlocks.length === 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSeedDefaultDaySchedule}
                icon={<Sparkles className="w-3.5 h-3.5 text-sky-400" />}
                className="shrink-0"
              >
                Seed Routine Schedule
              </Button>
            )}
          </div>
        )}

        {/* Historical Archive Notice Banner */}
        {isPast && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs text-neutral-400">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-neutral-500" />
              <span>Viewing historical archive for {friendlyDate}.</span>
            </div>
            <button
              onClick={handleJumpToToday}
              className="text-xs font-mono text-emerald-400 hover:underline cursor-pointer"
            >
              Jump to Active Day →
            </button>
          </div>
        )}
      </div>

      {/* 2. Executive Schedule Stats & Focus Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-5">
        <Card className="p-5 sm:p-6 flex flex-col justify-between border-neutral-800/80 bg-neutral-900/60">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">Scheduled Blocks</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-neutral-100">
              {sortedTimeBlocks.length}
            </div>
            <div className="text-[11px] text-neutral-400 font-mono mt-1">
              {completedBlocks.length} of {sortedTimeBlocks.length} completed
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6 flex flex-col justify-between border-neutral-800/80 bg-neutral-900/60">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">Planned Time</span>
            <Briefcase className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-neutral-100">
              {formatMinutes(totalPlannedBlockMinutes)}
            </div>
            <div className="text-[11px] text-neutral-400 font-mono mt-1">
              {formatMinutes(completedBlockMinutes)} fulfilled so far
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6 flex flex-col justify-between border-neutral-800/80 bg-neutral-900/60">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">Current Time</span>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-emerald-400">
              {currentTime}
            </div>
            <div className="text-[11px] text-neutral-400 font-mono mt-1">
              Real-time synchronization
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6 flex flex-col justify-between border-neutral-800/80 bg-neutral-900/60">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">Schedule Adherence</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-emerald-400">
              {sortedTimeBlocks.length > 0
                ? `${Math.round((completedBlocks.length / sortedTimeBlocks.length) * 100)}%`
                : '0%'}
            </div>
            <div className="w-full bg-neutral-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all"
                style={{
                  width: `${
                    sortedTimeBlocks.length > 0
                      ? (completedBlocks.length / sortedTimeBlocks.length) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Main Schedule Layout (Timeline vs Side-Panel) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Chronological Timeline / Time Blocks */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Chronological Time Blocks ({sortedTimeBlocks.length})
            </h2>

            {sortedTimeBlocks.length === 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSeedDefaultDaySchedule}
                icon={<Sparkles className="w-3.5 h-3.5 text-emerald-400" />}
              >
                Load Standard Schedule Template
              </Button>
            )}
          </div>

          {sortedTimeBlocks.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No time blocks scheduled for today"
              description="Build a structured daily execution schedule. Create dedicated blocks for Spirituality, Learning, Deep Work, and Recovery."
              action={
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSeedDefaultDaySchedule}
                    icon={<Sparkles className="w-3.5 h-3.5" />}
                  >
                    Generate Daily Template (08:00 - 17:00)
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openCreateTimeBlockModal()}
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add Custom Block
                  </Button>
                </div>
              }
            />
          ) : (
            <div className="space-y-4">
              {sortedTimeBlocks.map((block, idx) => {
                const linkedTask = tasks.find(t => t.id === block.taskId);
                const isCurrent = isCurrentTimeInWindow(currentTime, block.startTime, block.endTime);
                const isPast = timeToMinutes(block.endTime) < timeToMinutes(currentTime);
                const duration = getTimeDifferenceMinutes(block.startTime, block.endTime);
                const isActiveSession =
                  (block.status === 'in_progress' || (linkedTask && linkedTask.id === activeFocusTaskId)) &&
                  isTimerRunning;

                return (
                  <div
                    key={block.id}
                    className={`relative rounded-2xl border p-5 transition-all ${
                      isActiveSession
                        ? 'border-emerald-500/80 bg-emerald-950/20 ring-1 ring-emerald-500/50 shadow-lg shadow-emerald-950/30'
                        : isCurrent
                        ? 'border-blue-500/60 bg-blue-950/20 ring-1 ring-blue-500/40'
                        : block.status === 'completed'
                        ? 'border-neutral-800/80 bg-neutral-950/40 opacity-75'
                        : 'border-neutral-800/80 bg-neutral-900/60 hover:border-neutral-700'
                    }`}
                  >
                    {/* Active / Current indicator flag */}
                    {isActiveSession && (
                      <div className="absolute -top-2.5 right-4 px-3 py-0.5 rounded-full bg-emerald-400 text-neutral-950 text-[10px] font-mono font-bold flex items-center gap-1.5 shadow">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-950 animate-ping"></span>
                        ACTIVE EXECUTION NOW
                      </div>
                    )}
                    {isCurrent && !isActiveSession && (
                      <div className="absolute -top-2.5 right-4 px-3 py-0.5 rounded-full bg-blue-600 text-neutral-100 text-[10px] font-mono font-bold flex items-center gap-1">
                        CURRENT TIME WINDOW
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left: Time & Badges */}
                      <div className="flex items-start sm:items-center gap-4">
                        <div className="text-center shrink-0 w-24 px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800">
                          <span className="text-xs font-mono font-bold text-neutral-100 block">
                            {block.startTime}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-400 block mt-0.5">
                            ↓ {block.endTime}
                          </span>
                          <span className="text-[9px] font-mono text-emerald-400/80 block mt-0.5">
                            {duration}m
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getBlockCategoryBadge(block.blockType)}
                            <StatusBadge status={block.status} size="sm" />
                            {linkedTask && (
                              <PriorityBadge priority={linkedTask.priority} size="sm" />
                            )}
                          </div>

                          <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2 break-words">
                            {block.title}
                          </h3>

                          {block.notes && (
                            <p className="text-xs text-neutral-400 line-clamp-1 leading-relaxed">{block.notes}</p>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions & Execution */}
                      <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                        {/* Start / Focus button */}
                        {block.status !== 'completed' && linkedTask && (
                          <Button
                            variant={isActiveSession ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={() => {
                              if (isActiveSession) {
                                setActiveTab('now');
                              } else {
                                startFocusSession(linkedTask.id, block.id);
                                setActiveTab('now');
                              }
                            }}
                            icon={<Play className="w-3.5 h-3.5 fill-current" />}
                          >
                            {isActiveSession ? 'In Cockpit' : 'Start Focus'}
                          </Button>
                        )}

                        {block.status !== 'completed' && !linkedTask && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              openEditTimeBlockModal(block);
                            }}
                            icon={<CheckSquare className="w-3.5 h-3.5" />}
                          >
                            Link Task
                          </Button>
                        )}

                        {/* Shift Time Buttons (+/- 15m) */}
                        <div className="flex items-center border border-neutral-800 rounded-xl bg-neutral-950 p-1">
                          <button
                            type="button"
                            title="Shift earlier by 15m"
                            onClick={() => handleShiftBlock(block, -15)}
                            className="p-1 text-neutral-400 hover:text-emerald-400 transition-colors cursor-pointer"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[10px] font-mono text-neutral-500 px-1">15m</span>
                          <button
                            type="button"
                            title="Shift later by 15m"
                            onClick={() => handleShiftBlock(block, 15)}
                            className="p-1 text-neutral-400 hover:text-emerald-400 transition-colors cursor-pointer"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => openEditTimeBlockModal(block)}
                          title="Edit Block details"
                          className="p-2 rounded-xl text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => deleteTimeBlock(block.id)}
                          title="Delete Block"
                          className="p-2 rounded-xl text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Linked Task Details & Checklist (if present) */}
                    {linkedTask && (
                      <div className="mt-4 pt-3.5 border-t border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 text-neutral-400">
                          <FolderKanban className="w-3.5 h-3.5 text-neutral-500" />
                          <span>Task Link:</span>
                          <span className="text-neutral-200 font-medium">{linkedTask.title}</span>
                        </div>

                        {linkedTask.checklist && linkedTask.checklist.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-neutral-400">
                              Steps: {linkedTask.checklist.filter(c => c.done).length}/
                              {linkedTask.checklist.length}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Unscheduled Backlog & Staging Area */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-emerald-400" />
              Unscheduled Tasks ({unscheduledTasks.length})
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openCreateTaskModal({ scheduledDate: todayStr, status: 'planned' })}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Task
            </Button>
          </div>

          {unscheduledTasks.length === 0 ? (
            <Card className="p-6 text-center border-neutral-800/80 bg-neutral-900/40 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-xs font-semibold text-neutral-200">All Today's Tasks Are Scheduled!</p>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Every commitment for today has a dedicated execution time block.
              </p>
            </Card>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {unscheduledTasks.map(task => (
                <div
                  key={task.id}
                  className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 transition-colors space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <PriorityBadge priority={task.priority} size="sm" />
                        <CommitmentBadge level={task.commitmentLevel} size="sm" />
                      </div>
                      <h4 className="text-xs font-bold text-neutral-100">{task.title}</h4>
                    </div>

                    <span className="text-[11px] font-mono text-emerald-400 shrink-0">
                      {task.estimatedMinutes}m
                    </span>
                  </div>

                  {task.description && (
                    <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">{task.description}</p>
                  )}

                  <div className="pt-2.5 border-t border-neutral-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => openEditTaskModal(task)}
                      className="text-[11px] text-neutral-400 hover:text-neutral-200 cursor-pointer"
                    >
                      Edit details
                    </button>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleScheduleTask(task)}
                      icon={<Clock className="w-3 h-3" />}
                    >
                      Schedule Block
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Completed Today Section */}
          {completedTodayTasks.length > 0 && (
            <div className="pt-5 border-t border-neutral-800/80 space-y-3">
              <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Completed Today ({completedTodayTasks.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {completedTodayTasks.map(task => (
                  <div
                    key={task.id}
                    className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex items-center justify-between gap-2 opacity-75"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-xs text-neutral-300 line-through truncate">
                        {task.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 shrink-0">
                      {task.actualMinutes || task.estimatedMinutes}m
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Postpone Task Modal */}
      <PostponeTaskModal
        isOpen={!!postponeTaskTarget}
        onClose={() => setPostponeTaskTarget(null)}
        task={postponeTaskTarget}
      />
    </div>
  );
};
