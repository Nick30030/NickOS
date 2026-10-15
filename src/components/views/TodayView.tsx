import React, { useState, useEffect } from 'react';
import { useExecution } from '../../context/ExecutionContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { PriorityBadge, CommitmentBadge, StatusBadge } from '../common/Badge';
import { ProgressBar } from '../common/ProgressBar';
import { EmptyState } from '../common/EmptyState';
import { PostponeTaskModal } from '../modals/PostponeTaskModal';
import { DayTemplateModal } from '../modals/DayTemplateModal';
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
  Download,
  Upload,
  LayoutGrid,
  Filter,
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

  const { t } = useLanguage();

  const [postponeTaskTarget, setPostponeTaskTarget] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'blocks'>('timeline');
  const [currentTime, setCurrentTime] = useState(getCurrentTimeString());
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

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

  // Filtered blocks for Block Cards view
  const filteredBlocks = sortedTimeBlocks.filter(b => {
    if (categoryFilter === 'all') return true;
    return b.blockType === categoryFilter;
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
      deep_work: { label: t('deepWork', 'Deep Work'), icon: <Briefcase className="w-3 h-3" />, color: 'bg-blue-500/10 text-blue-300 border-blue-500/30' },
      shallow_work: { label: t('shallowWork', 'Shallow Work'), icon: <Clock className="w-3 h-3" />, color: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' },
      routine: { label: t('routine', 'Routine'), icon: <Clock className="w-3 h-3" />, color: 'bg-neutral-800 text-neutral-300 border-neutral-700' },
      spirituality: { label: t('spirituality', 'Spirituality'), icon: <Flame className="w-3 h-3" />, color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
      learning: { label: t('learning', 'Learning'), icon: <BookOpen className="w-3 h-3" />, color: 'bg-purple-500/10 text-purple-300 border-purple-500/30' },
      exercise: { label: t('exercise', 'Exercise'), icon: <Dumbbell className="w-3 h-3" />, color: 'bg-teal-500/10 text-teal-300 border-teal-500/30' },
      buffer: { label: t('buffer', 'Buffer'), icon: <Clock className="w-3 h-3" />, color: 'bg-neutral-800 text-neutral-400 border-neutral-700' },
      break: { label: t('rest', 'Break'), icon: <Coffee className="w-3 h-3" />, color: 'bg-neutral-800 text-neutral-300 border-neutral-700' },
      rest: { label: t('rest', 'Rest / Meal'), icon: <Coffee className="w-3 h-3" />, color: 'bg-neutral-800 text-neutral-300 border-neutral-700' },
      admin: { label: t('admin', 'Admin'), icon: <Clock className="w-3 h-3" />, color: 'bg-neutral-800 text-neutral-300 border-neutral-700' },
      social: { label: t('social', 'Social'), icon: <Users className="w-3 h-3" />, color: 'bg-pink-500/10 text-pink-300 border-pink-500/30' },
      personal: { label: t('personal', 'Personal'), icon: <User className="w-3 h-3" />, color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' },
      other: { label: t('other', 'Other'), icon: <MoreHorizontal className="w-3 h-3" />, color: 'bg-neutral-800 text-neutral-400 border-neutral-700' },
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
    let nextStart = isToday ? currentTime : '09:00';
    if (sortedTimeBlocks.length > 0) {
      const lastBlock = sortedTimeBlocks[sortedTimeBlocks.length - 1];
      nextStart = lastBlock.endTime;
    }
    const startMins = timeToMinutes(nextStart);
    const duration = task.estimatedMinutes || 45;
    const nextEnd = minutesToTime(Math.min(23 * 60 + 59, startMins + duration));

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

  // Quick status toggle for Block Cards view
  const handleToggleBlockStatus = async (block: TimeBlock) => {
    const nextStatus = block.status === 'completed' ? 'planned' : 'completed';
    await updateTimeBlock(block.id, { status: nextStatus });
    if (block.taskId && nextStatus === 'completed') {
      await updateTaskStatus(block.taskId, 'completed');
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
                {t('dailyPlannerTitle', 'Daily Planner & Timeline')}
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
                {isToday && ` (${t('todayTab', 'Today')})`}
                {isTomorrow && ` (${t('tomorrowTab', 'Tomorrow')})`}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1.5 leading-relaxed break-words font-sans">
              {isToday
                ? t('dailyProgram', 'Nick owns the schedule. Transform commitments into an actionable chronological timeline.')
                : isTomorrow
                ? "Advance Planning Mode: Sequence tomorrow's schedule and lock commitments ahead of time."
                : `Plan and structure execution routine for ${friendlyDate}.`}
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
              {t('todayTab', 'Today')}
            </button>

            <button
              onClick={handleJumpToTomorrow}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                isTomorrow
                  ? 'bg-sky-500 text-neutral-950 font-bold shadow-xs'
                  : 'text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800'
              }`}
            >
              {t('tomorrowTab', 'Tomorrow')}
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
          {/* Switcher: Timeline vs Block Cards */}
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'timeline'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{t('viewTimeline', 'Timeline')}</span>
            </button>
            <button
              onClick={() => setViewMode('blocks')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'blocks'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{t('viewBlockCards', 'Block Cards')}</span>
            </button>
          </div>

          {/* Action Buttons: Import/Export JSON + Add Block */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Import & Export JSON day type buttons */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsTemplateModalOpen(true)}
              icon={<Upload className="w-3.5 h-3.5 text-emerald-400" />}
              className="border-neutral-700 hover:border-emerald-500/50"
            >
              <span className="hidden sm:inline">{t('importDayJson', 'Importer (.json)')}</span>
              <span className="sm:hidden">Import</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsTemplateModalOpen(true)}
              icon={<Download className="w-3.5 h-3.5 text-sky-400" />}
              className="border-neutral-700 hover:border-sky-500/50"
            >
              <span className="hidden sm:inline">{t('exportDayJson', 'Exporter (.json)')}</span>
              <span className="sm:hidden">Export</span>
            </Button>

            {!isToday && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleJumpToToday}
                icon={<RotateCcw className="w-3.5 h-3.5 text-neutral-400" />}
              >
                {t('backToToday', "Retour à Aujourd'hui")}
              </Button>
            )}

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
              {t('addBlock', 'Ajouter un Bloc')}
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Executive Schedule Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-5">
        <Card className="p-5 sm:p-6 flex flex-col justify-between border-neutral-800/80 bg-neutral-900/60">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">{t('scheduledBlocksCount', 'Blocs programmés')}</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-neutral-100">
              {sortedTimeBlocks.length}
            </div>
            <p className="text-[11px] text-neutral-400 font-mono mt-1">
              {completedBlocks.length} {t('finishTask', 'terminés')}
            </p>
          </div>
        </Card>

        <Card className="p-5 sm:p-6 flex flex-col justify-between border-neutral-800/80 bg-neutral-900/60">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">{t('plannedTime', 'Temps planifié')}</span>
            <Sparkles className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-neutral-100">
              {formatMinutes(totalPlannedBlockMinutes)}
            </div>
            <p className="text-[11px] text-neutral-400 font-mono mt-1">
              {formatMinutes(completedBlockMinutes)} exécutés
            </p>
          </div>
        </Card>

        <Card className="p-5 sm:p-6 flex flex-col justify-between border-neutral-800/80 bg-neutral-900/60">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">{t('scheduleAdherence', 'Adhérence au planning')}</span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-emerald-400">
              {sortedTimeBlocks.length > 0
                ? `${Math.round((completedBlocks.length / sortedTimeBlocks.length) * 100)}%`
                : '0%'}
            </div>
            <p className="text-[11px] text-neutral-400 font-mono mt-1">
              Objectif d'adhérence &gt;85%
            </p>
          </div>
        </Card>

        <Card className="p-5 sm:p-6 flex flex-col justify-between border-neutral-800/80 bg-neutral-900/60">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">{t('importExportModalTitle', 'Journée Type')}</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsTemplateModalOpen(true)}
              icon={<Sparkles className="w-3.5 h-3.5 text-purple-400" />}
              className="w-full text-xs justify-center"
            >
              {t('loadDefaultTemplate', 'Gérer les Modèles')}
            </Button>
          </div>
        </Card>
      </div>

      {/* 3. Main Schedule Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: VIEW MODE (Timeline OR Block Cards) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Header of time block section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              {viewMode === 'timeline' ? (
                <Clock className="w-4 h-4 text-emerald-400" />
              ) : (
                <LayoutGrid className="w-4 h-4 text-emerald-400" />
              )}
              <h2 className="text-sm font-mono font-bold text-neutral-300 uppercase tracking-wider">
                {viewMode === 'timeline'
                  ? `${t('chronologicalBlocks', 'Blocs Chronologiques')} (${sortedTimeBlocks.length})`
                  : `${t('cardMatrixTitle', 'Matrice des Cartes Blocs')} (${filteredBlocks.length})`}
              </h2>
            </div>

            {/* If in Block Cards mode, show category filter pills */}
            {viewMode === 'blocks' && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px] font-mono">
                {[
                  { id: 'all', label: t('allCategories', 'Tout') },
                  { id: 'deep_work', label: 'Deep Work' },
                  { id: 'spirituality', label: 'Spiritualité' },
                  { id: 'exercise', label: 'Sport' },
                  { id: 'rest', label: 'Pause' },
                  { id: 'learning', label: 'Étude' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                      categoryFilter === cat.id
                        ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                        : 'text-neutral-400 hover:text-neutral-200 bg-neutral-900 border border-neutral-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Empty state when no blocks exist */}
          {sortedTimeBlocks.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="Aucun bloc de temps programmé pour cette journée"
              description="Créez une journée type structurée avec vos 10 blocs chronologiques (Spiritualité, AGC Deep Work, Entraînement, Repos)."
              action={
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsTemplateModalOpen(true)}
                    icon={<Sparkles className="w-3.5 h-3.5 fill-current" />}
                  >
                    {t('loadPreset10Blocks', 'Charger Modèle Souverain (10 Blocs)')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openCreateTimeBlockModal()}
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    {t('addBlock', 'Ajouter un Bloc')}
                  </Button>
                </div>
              }
            />
          ) : viewMode === 'blocks' ? (
            /* ========================================================================= */
            /* MODE: BLOCK CARDS MATRIX (High Utility Interactive Grid View)            */
            /* ========================================================================= */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBlocks.map(block => {
                const linkedTask = tasks.find(t => t.id === block.taskId);
                const isCurrent = isCurrentTimeInWindow(currentTime, block.startTime, block.endTime);
                const duration = getTimeDifferenceMinutes(block.startTime, block.endTime);
                const isActiveSession =
                  (block.status === 'in_progress' || (linkedTask && linkedTask.id === activeFocusTaskId)) &&
                  isTimerRunning;

                return (
                  <div
                    key={block.id}
                    className={`rounded-2xl border p-5 transition-all flex flex-col justify-between gap-4 ${
                      isActiveSession
                        ? 'border-emerald-500/80 bg-emerald-950/20 ring-1 ring-emerald-500/50 shadow-lg'
                        : isCurrent
                        ? 'border-blue-500/60 bg-blue-950/20 ring-1 ring-blue-500/40'
                        : block.status === 'completed'
                        ? 'border-neutral-800/80 bg-neutral-950/40 opacity-75'
                        : 'border-neutral-800/80 bg-neutral-900/60 hover:border-neutral-700'
                    }`}
                  >
                    {/* Card Top: Badges & Time Window */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getBlockCategoryBadge(block.blockType)}
                          <button
                            type="button"
                            onClick={() => handleToggleBlockStatus(block)}
                            className="cursor-pointer"
                            title="Changer statut"
                          >
                            <StatusBadge status={block.status} size="sm" />
                          </button>
                        </div>

                        <span className="text-xs font-mono font-bold text-neutral-200 px-2 py-0.5 rounded-lg bg-neutral-950 border border-neutral-800">
                          {block.startTime} - {block.endTime}
                        </span>
                      </div>

                      {/* Title & Notes */}
                      <div>
                        <h3 className="text-base font-bold text-neutral-100 break-words flex items-center gap-2">
                          {block.title}
                        </h3>
                        {block.notes && (
                          <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                            {block.notes}
                          </p>
                        )}
                      </div>

                      {/* Linked Task badge */}
                      {linkedTask && (
                        <div className="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800 text-xs flex items-center justify-between gap-2">
                          <span className="text-neutral-400 truncate">Tâche: {linkedTask.title}</span>
                          <PriorityBadge priority={linkedTask.priority} size="sm" />
                        </div>
                      )}
                    </div>

                    {/* Card Bottom: Action Toolbar */}
                    <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 font-mono text-[11px] text-neutral-400">
                        <Clock className="w-3.5 h-3.5 text-neutral-500" />
                        <span>{duration}m</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Start focus session button */}
                        <Button
                          variant={isActiveSession ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => {
                            if (linkedTask) {
                              startFocusSession(linkedTask.id, block.id);
                            }
                            setActiveTab('now');
                          }}
                          icon={<Play className="w-3 h-3 fill-current" />}
                        >
                          {isActiveSession ? t('inCockpit', 'Cockpit') : t('startFocus', 'Focus')}
                        </Button>

                        {/* Shift time (+/- 15m) */}
                        <div className="flex items-center border border-neutral-800 rounded-lg bg-neutral-950 p-0.5">
                          <button
                            type="button"
                            title={t('shiftEarlier', 'Avancer 15m')}
                            onClick={() => handleShiftBlock(block, -15)}
                            className="p-1 text-neutral-400 hover:text-emerald-400 transition-colors cursor-pointer"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            title={t('shiftLater', 'Reculer 15m')}
                            onClick={() => handleShiftBlock(block, 15)}
                            className="p-1 text-neutral-400 hover:text-emerald-400 transition-colors cursor-pointer"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Edit block */}
                        <button
                          type="button"
                          onClick={() => openEditTimeBlockModal(block)}
                          title={t('edit', 'Modifier')}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete block */}
                        <button
                          type="button"
                          onClick={() => deleteTimeBlock(block.id)}
                          title={t('delete', 'Supprimer')}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ========================================================================= */
            /* MODE: CHRONOLOGICAL TIMELINE                                             */
            /* ========================================================================= */
            <div className="space-y-4">
              {sortedTimeBlocks.map(block => {
                const linkedTask = tasks.find(t => t.id === block.taskId);
                const isCurrent = isCurrentTimeInWindow(currentTime, block.startTime, block.endTime);
                const duration = getTimeDifferenceMinutes(block.startTime, block.endTime);
                const isActiveSession =
                  (block.status === 'in_progress' || (linkedTask && linkedTask.id === activeFocusTaskId)) &&
                  isTimerRunning;

                return (
                  <div
                    key={block.id}
                    className={`relative rounded-2xl border p-5 transition-all ${
                      isActiveSession
                        ? 'border-emerald-500/80 bg-emerald-950/20 ring-1 ring-emerald-500/50 shadow-lg'
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
                        {t('activeExecutionNow', 'EXÉCUTION ACTIVE')}
                      </div>
                    )}
                    {isCurrent && !isActiveSession && (
                      <div className="absolute -top-2.5 right-4 px-3 py-0.5 rounded-full bg-blue-600 text-neutral-100 text-[10px] font-mono font-bold flex items-center gap-1">
                        {t('currentTimeWindow', 'CRÉNEAU ACTUEL')}
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
                            <button
                              type="button"
                              onClick={() => handleToggleBlockStatus(block)}
                              className="cursor-pointer"
                              title="Changer statut"
                            >
                              <StatusBadge status={block.status} size="sm" />
                            </button>
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
                            {isActiveSession ? t('inCockpit', 'In Cockpit') : t('startFocus', 'Start Focus')}
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
                            {t('linkTask', 'Link Task')}
                          </Button>
                        )}

                        {/* Shift Time Buttons (+/- 15m) */}
                        <div className="flex items-center border border-neutral-800 rounded-xl bg-neutral-950 p-1">
                          <button
                            type="button"
                            title={t('shiftEarlier', 'Shift earlier by 15m')}
                            onClick={() => handleShiftBlock(block, -15)}
                            className="p-1 text-neutral-400 hover:text-emerald-400 transition-colors cursor-pointer"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[10px] font-mono text-neutral-500 px-1">15m</span>
                          <button
                            type="button"
                            title={t('shiftLater', 'Shift later by 15m')}
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
                          title={t('edit', 'Edit Block')}
                          className="p-2 rounded-xl text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => deleteTimeBlock(block.id)}
                          title={t('delete', 'Delete Block')}
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
                          <span>{t('tasks', 'Tâche')}:</span>
                          <span className="text-neutral-200 font-medium">{linkedTask.title}</span>
                        </div>

                        {linkedTask.checklist && linkedTask.checklist.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-neutral-400">
                              Checklist: {linkedTask.checklist.filter(c => c.done).length}/
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
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <h2 className="text-sm font-mono font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-emerald-400" />
              {t('unscheduledTasksTitle', 'Tâches Non Planifiées')} ({unscheduledTasks.length})
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openCreateTaskModal({ scheduledDate: todayStr, status: 'planned' })}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              {t('createTask', 'Add Task')}
            </Button>
          </div>

          {unscheduledTasks.length === 0 ? (
            <Card className="p-6 text-center border-neutral-800/80 bg-neutral-900/40 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-xs font-semibold text-neutral-200">{t('noUnscheduledTasks', "Toutes les tâches sont intégrées dans le planning.")}</p>
              <p className="text-[11px] text-neutral-400 leading-relaxed font-sans">
                Chaque engagement dispose d'un créneau dédié.
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
                      {t('edit', 'Modifier')}
                    </button>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleScheduleTask(task)}
                      icon={<Clock className="w-3 h-3" />}
                    >
                      {t('linkTask', 'Planifier')}
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
                {t('finishTask', 'Terminées aujourd’hui')} ({completedTodayTasks.length})
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

      {/* Day Template JSON Import / Export Modal */}
      <DayTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        activeDate={activeDate}
      />
    </div>
  );
};
