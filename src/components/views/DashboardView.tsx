import React from 'react';
import { useExecution } from '../../context/ExecutionContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { ProgressBar } from '../common/ProgressBar';
import { StatBox } from '../common/StatBox';
import { PriorityBadge, CommitmentBadge, StatusBadge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { HelpTooltip } from '../common/HelpTooltip';
import { VoiceService } from '../../services/voice/VoiceService';
import {
  formatFriendlyDate,
  formatMinutes,
  formatSecondsToTimer,
  getTodayString,
  isDateOverdue,
} from '../../lib/utils';
import {
  Play,
  Pause,
  CheckCircle2,
  Calendar,
  Plus,
  ArrowRight,
  ShieldCheck,
  Clock,
  Crosshair,
  TrendingUp,
  AlertCircle,
  FolderKanban,
  Target,
  Check,
  Zap,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    tasks,
    projects,
    goals,
    todayPlan,
    commitments,
    metrics,
    accountabilityRecord,
    activeTask,
    isTimerRunning,
    timerElapsedSeconds,
    startFocusSession,
    pauseFocusSession,
    resumeFocusSession,
    completeActiveTask,
    approveCommitment,
    updateTaskStatus,
    setActiveTab,
    openCreateTaskModal,
    openCreateProjectModal,
    setIsPlanDayModalOpen,
  } = useExecution();
  const { t } = useLanguage();

  const todayStr = getTodayString();
  const friendlyDate = formatFriendlyDate(todayStr);

  const [idleExplanation, setIdleExplanation] = React.useState('');
  const [submittedExplanation, setSubmittedExplanation] = React.useState(false);

  const todayTasks = tasks.filter(
    t => t.scheduledDate === todayStr || t.status === 'in_progress'
  );

  React.useEffect(() => {
    if (todayTasks.length === 0) {
      const hasTriggeredKey = `nick_os_idle_alert_triggered_${todayStr}`;
      if (!sessionStorage.getItem(hasTriggeredKey)) {
        sessionStorage.setItem(hasTriggeredKey, 'true');
        VoiceService.triggerStateAlert(
          'idle_warning',
          "Nick, attention. Aucun programme n'est planifié pour aujourd'hui. Est-ce normal ? Expliquez-moi pourquoi ou établissons un plan."
        );
      }
    }
  }, [todayTasks.length, todayStr]);
  const completedTodayTasks = todayTasks.filter(t => t.status === 'completed');
  const pendingTodayTasks = todayTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');

  const executionScore = metrics?.executionScore ?? (todayTasks.length > 0 ? Math.round((completedTodayTasks.length / todayTasks.length) * 100) : 0);
  const plannedMins = metrics?.plannedMinutes ?? todayTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
  const actualMins = (metrics?.actualMinutes ?? completedTodayTasks.reduce((sum, t) => sum + (t.actualMinutes || 0), 0)) + Math.round(timerElapsedSeconds / 60);

  const hardCommitmentsCount = todayTasks.filter(t => t.commitmentLevel === 'hard_commitment').length;
  const fulfilledHardCommitments = todayTasks.filter(t => t.commitmentLevel === 'hard_commitment' && t.status === 'completed').length;

  return (
    <div className="w-full overflow-hidden space-y-10 sm:space-y-12 animate-in fade-in duration-200">
      {/* Executive Greeting Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-800/80 w-full overflow-hidden">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-100 break-words flex items-center gap-3">
            {t('goodMorning', 'Bonjour, Nick.')}
            <HelpTooltip title={t('dashboard', 'Dashboard Command Center')} content="Your daily execution overview. Tracks your execution score, planned vs actual minutes, and non-negotiable hard commitments." />
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1.5 font-mono break-words">
            {friendlyDate} — {t('dailyProgram', "Le programme d'exécution quotidien est actif et suivi.")}
          </p>
        </div>

        {/* Quick Access Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsPlanDayModalOpen(true)}
            leftIcon={<Calendar className="w-3.5 h-3.5 text-neutral-400" />}
          >
            {t('planDay', 'Planifier la journée')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => openCreateTaskModal({ scheduledDate: todayStr })}
            leftIcon={<Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
          >
            {t('createTask', 'Créer une tâche')}
          </Button>
        </div>
      </div>

      {/* Execution Progress & High-Level Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        <StatBox
          label={t('executionScore', "Score d'exécution")}
          value={`${executionScore}%`}
          subValue="Target: >85%"
          icon={TrendingUp}
          highlight={executionScore >= 80}
          trend={{
            positive: executionScore >= 75,
            text: executionScore >= 75 ? 'Pacing on track' : 'Execution variance detected',
          }}
        />

        <StatBox
          label={t('todaysTasks', "Tâches d'aujourd'hui")}
          value={`${completedTodayTasks.length} / ${todayTasks.length}`}
          subValue={`${pendingTodayTasks.length} pending`}
          icon={CheckCircle2}
        />

        <StatBox
          label={t('plannedVsActual', 'Planifié vs Réel')}
          value={formatMinutes(actualMins)}
          subValue={`of ${formatMinutes(plannedMins)} planned`}
          icon={Clock}
        />

        <StatBox
          label={t('hardCommitments', 'Engagements fermes')}
          value={`${fulfilledHardCommitments} / ${hardCommitmentsCount}`}
          subValue="Non-negotiables"
          icon={ShieldCheck}
          highlight={fulfilledHardCommitments === hardCommitmentsCount && hardCommitmentsCount > 0}
        />
      </div>

      {/* PROACTIVE EMPTY-DAY MONITOR & INTERROGATION CARD */}
      {todayTasks.length === 0 && (
        <Card variant="default" className="p-6 sm:p-7 bg-amber-950/5 border border-amber-500/20 backdrop-blur-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500 animate-bounce" />
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400">
                  Alerte de Programme Manquant — Nick OS Intelligence
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-neutral-100">
                Nick, vous n'avez aucun travail ou programme planifié pour aujourd'hui.
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 max-w-3xl leading-relaxed">
                Est-ce une journée de récupération planifiée, ou y a-t-il une autre raison ? Écrivez-la ci-dessous pour que nous puissions adapter les notifications, ou générons instantanément un programme adapté via l'IA.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsPlanDayModalOpen(true)}
                className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold font-mono rounded-xl border-none"
              >
                Générer un Programme d'IA
              </Button>
            </div>
          </div>

          {!submittedExplanation ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (idleExplanation.trim()) {
                  setSubmittedExplanation(true);
                  VoiceService.speak("Explication enregistrée. Profitez bien de votre journée Nick.", true);
                }
              }}
              className="flex flex-col sm:flex-row items-stretch gap-3 pt-2"
            >
              <input
                type="text"
                placeholder="Ex: 'Aujourd'hui je fais une pause récupération pour le projet' ou 'Je commence à planifier maintenant'"
                value={idleExplanation}
                onChange={(e) => setIdleExplanation(e.target.value)}
                className="flex-1 bg-neutral-950 border border-neutral-850 rounded-xl px-4 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500 font-mono placeholder:text-neutral-600"
              />
              <Button type="submit" variant="secondary" size="sm" className="rounded-xl border border-neutral-800 hover:bg-neutral-850 font-mono text-xs">
                Valider l'Explication
              </Button>
            </form>
          ) : (
            <div className="p-3 bg-emerald-950/15 border border-emerald-900/30 rounded-xl text-xs text-emerald-400 font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>
                Explication prise en compte : <strong>« {idleExplanation} »</strong>. Nick OS passe en veille bienveillante et désactive les alertes agressives pour aujourd'hui. Profitez bien !
              </span>
            </div>
          )}
        </Card>
      )}

      {/* Today's Execution Program Bar */}
      {todayPlan && (
        <Card variant="highlight" className="p-6 sm:p-7 bg-neutral-900/80 backdrop-blur-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                  Today's Prime Focus Target
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono border border-emerald-500/25">
                  {todayPlan.energyTarget?.toUpperCase()} CADENCE
                </span>
              </div>
              <p className="text-sm sm:text-base font-semibold text-neutral-100">{todayPlan.focusGoalToday}</p>
            </div>

            <div className="text-right">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('today')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                View Full Day Schedule
              </Button>
            </div>
          </div>

          <ProgressBar
            value={todayTasks.length > 0 ? (completedTodayTasks.length / todayTasks.length) * 100 : 0}
            variant="gradient"
            size="md"
            showLabel
          />
        </Card>
      )}

      {/* Two Column Layout: Current Active Task & Daily Commitments */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10">
        {/* Left Column (7 cols): Current Active Task + Today's Scheduled Tasks */}
        <div className="lg:col-span-7 space-y-8">
          {/* CURRENT ACTIVE TASK (NOW COCKPIT SUMMARY) */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-200 font-mono">
                  Current Active Task
                </h2>
              </div>
              {activeTask && (
                <button
                  onClick={() => setActiveTab('now')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1.5 cursor-pointer"
                >
                  Enter Cockpit <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {activeTask ? (
              <Card variant="active" className="p-6 sm:p-7 relative overflow-hidden border-emerald-500/40">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <PriorityBadge priority={activeTask.priority} />
                      <CommitmentBadge level={activeTask.commitmentLevel} />
                      {activeTask.scheduledStartTime && (
                        <span className="text-[11px] font-mono text-neutral-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-neutral-500" />
                          {activeTask.scheduledStartTime}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-neutral-100">{activeTask.title}</h3>
                    {activeTask.description && (
                      <p className="text-xs sm:text-sm text-neutral-400 line-clamp-2 leading-relaxed">{activeTask.description}</p>
                    )}

                    {activeTask.checklist && activeTask.checklist.length > 0 && (
                      <div className="pt-2 text-xs font-mono text-neutral-400">
                        Checklist:{' '}
                        <span className="text-emerald-300 font-semibold">
                          {activeTask.checklist.filter(c => c.done).length}/{activeTask.checklist.length} completed
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Active Timer & Controls */}
                  <div className="flex flex-col items-end gap-3.5 bg-neutral-950/80 p-4 rounded-xl border border-neutral-800 min-w-[160px]">
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-neutral-500 block uppercase">Elapsed Time</span>
                      <span className="text-2xl font-mono font-bold text-emerald-400 tracking-wider">
                        {formatSecondsToTimer(timerElapsedSeconds)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 w-full">
                      {isTimerRunning ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => pauseFocusSession()}
                          leftIcon={<Pause className="w-3.5 h-3.5 text-emerald-400" />}
                          className="flex-1"
                        >
                          Pause
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => resumeFocusSession()}
                          leftIcon={<Play className="w-3.5 h-3.5 text-neutral-950" />}
                          className="flex-1"
                        >
                          Resume
                        </Button>
                      )}

                      <Button
                        variant="emerald"
                        size="sm"
                        onClick={() => completeActiveTask()}
                        title="Mark Complete"
                      >
                        <Check className="w-4 h-4 text-emerald-300" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <EmptyState
                icon={Crosshair}
                title="No Active Focus Task"
                description="Select a planned task below to start your next execution block."
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (pendingTodayTasks.length > 0) {
                        startFocusSession(pendingTodayTasks[0].id);
                      } else {
                        openCreateTaskModal({ scheduledDate: todayStr });
                      }
                    }}
                    leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
                  >
                    {pendingTodayTasks.length > 0 ? 'Start First Task' : 'Create Task'}
                  </Button>
                }
              />
            )}
          </div>

          {/* TODAY'S SCHEDULED TASKS */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-200 font-mono">
                Today's Planned Program ({pendingTodayTasks.length})
              </h2>
              <button
                onClick={() => setActiveTab('tasks')}
                className="text-xs text-neutral-400 hover:text-neutral-200 font-mono flex items-center gap-1 cursor-pointer"
              >
                Task Backlog <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {pendingTodayTasks.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Today's Program Completed"
                description="All planned tasks for today have been executed. Outstanding focus."
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openCreateTaskModal({ scheduledDate: todayStr })}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add Task to Today
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {pendingTodayTasks.map(task => {
                  const project = projects.find(p => p.id === task.projectId);

                  return (
                    <div
                      key={task.id}
                      className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <PriorityBadge priority={task.priority} size="sm" />
                          <CommitmentBadge level={task.commitmentLevel} size="sm" />
                          {project && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-emerald-300 border border-neutral-700/60 shrink-0">
                              {project.code}
                            </span>
                          )}
                          {task.scheduledStartTime && (
                            <span className="text-[11px] font-mono text-neutral-400 shrink-0">
                              {task.scheduledStartTime}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-neutral-200 break-words">
                          {task.title}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-mono text-neutral-400 hidden sm:inline">
                          {formatMinutes(task.estimatedMinutes)}
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => startFocusSession(task.id)}
                          leftIcon={<Play className="w-3 h-3 text-emerald-400 fill-current" />}
                        >
                          Focus
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Active Projects & Daily Commitments */}
        <div className="lg:col-span-5 space-y-8">
          {/* ACTIVE PROJECTS SUMMARY */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-200 font-mono">
                  Active Projects ({projects.filter(p => p.status === 'active').length})
                </h2>
              </div>
              <button
                onClick={() => setActiveTab('projects')}
                className="text-xs text-neutral-400 hover:text-neutral-200 font-mono flex items-center gap-1 cursor-pointer"
              >
                All Projects <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-3">
              {projects.filter(p => p.status === 'active').slice(0, 3).map(proj => {
                const projTasks = tasks.filter(t => t.projectId === proj.id);
                const completed = projTasks.filter(t => t.status === 'completed').length;
                const pct = projTasks.length > 0 ? Math.round((completed / projTasks.length) * 100) : 0;

                return (
                  <div
                    key={proj.id}
                    className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-neutral-200 break-words">
                        {proj.code} — {proj.name}
                      </span>
                      <span className="text-[11px] font-mono text-emerald-400 font-bold shrink-0">{pct}%</span>
                    </div>
                    <ProgressBar value={pct} variant="emerald" size="sm" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* DAILY RECONCILIATION & ACCOUNTABILITY CARD */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-200 font-mono">
                  Daily Accountability
                </h2>
              </div>
              <span
                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                  accountabilityRecord?.isFinalized
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                }`}
              >
                {accountabilityRecord?.isFinalized ? 'Sealed' : 'Unfinalized'}
              </span>
            </div>

            <Card variant="highlight" className="p-6 space-y-4 bg-neutral-900/80">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-neutral-400">Execution Score</span>
                  <div className="text-xl font-mono font-bold text-neutral-100">
                    {accountabilityRecord ? Math.round(accountabilityRecord.executionRate * 100) : executionScore}%
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono uppercase text-neutral-400">Tracked vs Planned</span>
                  <div className="text-xs font-mono font-semibold text-neutral-200">
                    {accountabilityRecord?.actualMinutes || actualMins}m / {accountabilityRecord?.plannedMinutes || plannedMins}m
                  </div>
                </div>
              </div>

              <div className="text-xs text-neutral-400 font-mono leading-relaxed">
                {accountabilityRecord?.isFinalized
                  ? 'Today is sealed. Review factual outputs or audit performance.'
                  : 'Compare planned tasks with actual session logs, categorize interruptions, and seal today.'}
              </div>

              <Button
                variant="emerald"
                size="sm"
                fullWidth
                onClick={() => setActiveTab('accountability')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5 text-neutral-950" />}
              >
                {accountabilityRecord?.isFinalized ? 'View Day Audit' : 'Open Reconciliation Protocol'}
              </Button>
            </Card>
          </div>

          {/* DAILY COMMITMENTS */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-200 font-mono">
                  Daily Commitments
                </h2>
              </div>
              <span className="text-[10px] font-mono text-neutral-400">Decision Authority: Nick</span>
            </div>

            <Card variant="subtle" className="p-6 space-y-4">
              <div className="text-xs text-neutral-400 font-mono leading-relaxed">
                NICK OS proposes and tracks. Important commitments require Nick's explicit confirmation.
              </div>

              <div className="space-y-3">
                {commitments.map(comm => (
                  <div
                    key={comm.id}
                    className={`p-3.5 rounded-xl border transition-colors ${
                      comm.isApprovedByNick
                        ? 'bg-neutral-950 border-emerald-800/40'
                        : 'bg-neutral-950/70 border-neutral-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold shrink-0 ${
                              comm.category === 'deep_work'
                                ? 'bg-blue-950 text-blue-300 border border-blue-800/40'
                                : comm.category === 'health'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                                : 'bg-neutral-900 text-neutral-300 border border-neutral-800'
                            }`}
                          >
                            {comm.category.toUpperCase().replace('_', ' ')}
                          </span>
                          {comm.timeWindow && (
                            <span className="text-[11px] font-mono text-neutral-400 shrink-0">
                              {comm.timeWindow}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-neutral-200 break-words">{comm.title}</p>
                        {comm.description && (
                          <p className="text-[11px] text-neutral-400 leading-relaxed break-words">{comm.description}</p>
                        )}
                      </div>

                      {/* Nick Decision Approval Button */}
                      <button
                        onClick={() => approveCommitment(comm.id, !comm.isApprovedByNick)}
                        className={`p-2 rounded-xl border text-xs font-mono transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                          comm.isApprovedByNick
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-emerald-500/50 hover:text-emerald-300'
                        }`}
                        title={comm.isApprovedByNick ? 'Commitment Locked by Nick' : 'Click to approve commitment as Nick'}
                      >
                        {comm.isApprovedByNick ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span className="text-[10px]">Locked</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span className="text-[10px]">Approve</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
