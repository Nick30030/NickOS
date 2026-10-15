import React, { useState } from 'react';
import { useExecution } from '../../context/ExecutionContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge, StatusBadge } from '../common/Badge';
import { ProgressBar } from '../common/ProgressBar';
import { EmptyState } from '../common/EmptyState';
import { Goal, GoalCategory, GoalStatus } from '../../types/domain';
import { formatFriendlyDate, isDateOverdue, isDateToday } from '../../lib/utils';
import {
  Target,
  Plus,
  Edit2,
  Trash2,
  FolderKanban,
  CheckSquare,
  Search,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

export const GoalsView: React.FC = () => {
  const {
    goals,
    projects,
    tasks,
    lifeAreas,
    openCreateGoalModal,
    openEditGoalModal,
    deleteGoal,
    openCreateProjectModal,
    openCreateTaskModal,
    setActiveTab,
  } = useExecution();
  const { t } = useLanguage();

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGoals = goals.filter(goal => {
    if (categoryFilter !== 'all' && goal.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && goal.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        goal.title.toLowerCase().includes(q) ||
        goal.description?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getLifeArea = (areaId?: string) => {
    if (!areaId) return null;
    return lifeAreas.find(a => a.id === areaId);
  };

  const handleDeleteGoal = async (goalId: string, goalTitle: string) => {
    if (window.confirm(`Are you sure you want to archive or remove the goal: "${goalTitle}"?`)) {
      await deleteGoal(goalId);
    }
  };

  const getStatusBadge = (status: GoalStatus) => {
    switch (status) {
      case 'on_track':
        return <Badge variant="emerald" size="sm">{t('onTrack', 'ON TRACK')}</Badge>;
      case 'at_risk':
        return <Badge variant="amber" size="sm">{t('atRisk', 'AT RISK')}</Badge>;
      case 'behind':
        return <Badge variant="rose" size="sm">{t('behind', 'BEHIND')}</Badge>;
      case 'achieved':
        return <Badge variant="emerald" size="sm">{t('achieved', 'ACHIEVED')}</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="w-full overflow-hidden space-y-8 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800/80 w-full overflow-hidden">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-100 flex items-center gap-2.5 break-words">
            <Target className="w-7 h-7 text-emerald-400 shrink-0" />
            {t('goalsHeader', 'Strategic Goals & Targets')}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 font-mono mt-1.5 leading-relaxed break-words">
            {t('goalsSubtitle', "High-level commitments framing Nick's daily execution requirements.")}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => openCreateGoalModal()}
          icon={<Plus className="w-4 h-4" />}
          className="rounded-xl"
        >
          {t('newGoal', 'New Goal')}
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 bg-neutral-950 rounded-2xl border border-neutral-800 text-xs">
          {[
            { id: 'all', label: t('all', 'All Goals') },
            { id: 'quarterly', label: t('horizonQuarter', 'Quarterly') },
            { id: 'annual', label: t('horizonYear', 'Annual') },
            { id: 'habit', label: t('horizonLife', 'Habits / Standards') },
            { id: 'operational', label: t('operational', 'Operational') },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl font-mono transition-all cursor-pointer whitespace-nowrap ${
                categoryFilter === tab.id
                  ? 'bg-emerald-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 py-2 text-xs text-neutral-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">{t('allStatus', 'All Statuses')}</option>
            <option value="on_track">🟢 {t('onTrack', 'On Track')}</option>
            <option value="at_risk">🟡 {t('atRisk', 'At Risk')}</option>
            <option value="behind">🔴 {t('behind', 'Behind')}</option>
            <option value="achieved">🏆 {t('achieved', 'Achieved')}</option>
          </select>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder={t('searchPlaceholder', 'Search goals...')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-xl bg-neutral-950 border border-neutral-800 pl-9 pr-3.5 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Goals Grid */}
      {filteredGoals.length === 0 ? (
        <EmptyState
          icon={Target}
          title={t('noGoalsFound', 'No goals found.')}
          description={t('noGoalsDesc', 'Define your strategic priorities to bring meaning to each day.')}
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => openCreateGoalModal()}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              {t('newGoal', 'New Goal')}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGoals.map(goal => {
            const targetVal = goal.targetValue ?? 100;
            const currentVal = goal.currentValue ?? goal.progressPercentage ?? 0;
            const progressPct = targetVal > 0
              ? Math.min(100, Math.max(0, Math.round((currentVal / targetVal) * 100)))
              : (goal.progressPercentage || 0);

            const area = getLifeArea(goal.lifeAreaId);
            const linkedProjects = projects.filter(p => p.goalId === goal.id);
            const linkedTasks = tasks.filter(t => t.goalId === goal.id);
            const completedLinkedTasks = linkedTasks.filter(t => t.status === 'completed');
            const isOverdue = goal.deadline && isDateOverdue(goal.deadline) && goal.status !== 'completed';

            return (
              <Card
                key={goal.id}
                variant="default"
                className="p-5 flex flex-col justify-between space-y-4 hover:border-neutral-700 transition-colors"
              >
                {/* Header Row: Category & Status Badges */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Badge variant={goal.category === 'quarterly' || goal.horizon === 'quarterly' ? 'amber' : 'neutral'} size="sm">
                        {(goal.category || goal.horizon || 'Strategic').toUpperCase()}
                      </Badge>
                      {area && (
                        <span
                          className="text-[10px] font-mono px-2 py-0.5 rounded border border-neutral-700 bg-neutral-900 text-neutral-300"
                        >
                          {area.name}
                        </span>
                      )}
                    </div>
                    {getStatusBadge(goal.status)}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-neutral-100 leading-snug break-words">{goal.title}</h3>
                    {goal.description && (
                      <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed break-words">
                        {goal.description}
                      </p>
                    )}
                  </div>

                  {/* Progress Milestone Bar */}
                  <div className="p-3 bg-neutral-950/60 rounded-lg border border-neutral-850 space-y-2">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-neutral-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-amber-400" />
                        {t('targetDate', 'Target Progress')}
                      </span>
                      <span className="text-amber-400 font-bold">
                        {goal.currentValue} / {goal.targetValue} {goal.metricUnit} ({progressPct}%)
                      </span>
                    </div>
                    <ProgressBar value={progressPct} variant="amber" size="sm" />
                  </div>

                  {/* Deadline Notice */}
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-neutral-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                      {t('targetDate', 'Target Date:')}
                    </span>
                    <span
                      className={`font-semibold ${
                        isOverdue ? 'text-rose-400 font-bold' : 'text-neutral-200'
                      }`}
                    >
                      {goal.deadline ? formatFriendlyDate(goal.deadline) : 'Ongoing'}
                      {isOverdue && ' (Overdue)'}
                    </span>
                  </div>

                  {/* Associated Projects & Tasks Summary */}
                  <div className="pt-2 border-t border-neutral-850 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
                      <span className="flex items-center gap-1">
                        <FolderKanban className="w-3.5 h-3.5 text-neutral-500" />
                        {linkedProjects.length} {t('projects', 'Projects')}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckSquare className="w-3.5 h-3.5 text-neutral-500" />
                        {completedLinkedTasks.length}/{linkedTasks.length} {t('tasks', 'Tasks')} {t('done', 'Done')}
                      </span>
                    </div>

                    {/* Linked Project Chips */}
                    {linkedProjects.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {linkedProjects.slice(0, 3).map(p => (
                          <span
                            key={p.id}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 truncate max-w-[120px]"
                            title={p.name}
                          >
                            {p.code}: {p.name}
                          </span>
                        ))}
                        {linkedProjects.length > 3 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                            +{linkedProjects.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditGoalModal(goal)}
                      className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                      title={t('edit', 'Edit Goal')}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(goal.id, goal.title)}
                      className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
                      title={t('delete', 'Delete Goal')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openCreateProjectModal({ goalId: goal.id, lifeAreaId: goal.lifeAreaId })}
                      className="text-[11px] font-mono px-2 py-1 rounded bg-neutral-850 hover:bg-neutral-800 text-neutral-300 hover:text-neutral-100 transition-colors cursor-pointer"
                    >
                      + {t('projects', 'Project')}
                    </button>
                    <button
                      onClick={() => openCreateTaskModal({ goalId: goal.id, lifeAreaId: goal.lifeAreaId })}
                      className="text-[11px] font-mono px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
                    >
                      + {t('tasks', 'Task')}
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
