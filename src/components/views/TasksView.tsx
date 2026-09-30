import React, { useState } from 'react';
import { useExecution } from '../../context/ExecutionContext';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { PriorityBadge, CommitmentBadge, StatusBadge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { Task, TaskPriority, TaskStatus } from '../../types/domain';
import {
  formatMinutes,
  formatFriendlyDate,
  getTodayString,
  getTomorrowString,
  addDaysToDate,
  isDateOverdue,
  isDateToday,
} from '../../lib/utils';
import {
  CheckSquare,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit2,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  FolderKanban,
  Target,
  Check,
  ListTodo,
} from 'lucide-react';

type FilterTab = 'today' | 'upcoming' | 'overdue' | 'inbox' | 'completed' | 'all';

export const TasksView: React.FC = () => {
  const {
    tasks,
    projects,
    goals,
    lifeAreas,
    activeFocusTaskId,
    isTimerRunning,
    startFocusSession,
    pauseFocusSession,
    resumeFocusSession,
    updateTaskStatus,
    postponeTask,
    deleteTask,
    toggleChecklistItem,
    openCreateTaskModal,
    openEditTaskModal,
  } = useExecution();

  const [activeFilterTab, setActiveFilterTab] = useState<FilterTab>('today');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedLifeAreaId, setSelectedLifeAreaId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openPostponeDropdownId, setOpenPostponeDropdownId] = useState<string | null>(null);

  const todayStr = getTodayString();

  // Filter Logic
  const filteredTasks = tasks.filter(task => {
    // 1. Tab Filter
    if (activeFilterTab === 'today') {
      const isScheduledToday = task.scheduledDate === todayStr;
      const isInProg = task.status === 'in_progress';
      const isPlannedToday = (task.status === 'planned' || task.status === 'todo') && (!task.scheduledDate || task.scheduledDate === todayStr);
      if (!(isScheduledToday || isInProg || (isPlannedToday && task.scheduledDate === todayStr))) {
        return false;
      }
    } else if (activeFilterTab === 'upcoming') {
      if (task.status === 'completed' || task.status === 'cancelled') return false;
      const hasUpcomingDate = (task.scheduledDate && task.scheduledDate > todayStr) || (task.dueDate && task.dueDate > todayStr);
      if (!hasUpcomingDate) return false;
    } else if (activeFilterTab === 'overdue') {
      if (task.status === 'completed' || task.status === 'cancelled') return false;
      const isSchedOverdue = task.scheduledDate && task.scheduledDate < todayStr;
      const isDueOverdue = task.dueDate && task.dueDate < todayStr;
      if (!(isSchedOverdue || isDueOverdue)) return false;
    } else if (activeFilterTab === 'inbox') {
      if (task.status === 'completed' || task.status === 'cancelled') return false;
      if (task.status !== 'inbox' && task.scheduledDate) return false;
    } else if (activeFilterTab === 'completed') {
      if (task.status !== 'completed') return false;
    }

    // 2. Dropdown Filters
    if (selectedProjectId !== 'all' && task.projectId !== selectedProjectId) return false;
    if (selectedPriority !== 'all' && task.priority !== selectedPriority) return false;
    if (selectedLifeAreaId !== 'all' && task.lifeAreaId !== selectedLifeAreaId) return false;

    // 3. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      const matchTags = task.tags?.some(t => t.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchTags) return false;
    }

    return true;
  });

  // Helper getters
  const getProject = (id?: string) => projects.find(p => p.id === id);
  const getGoal = (id?: string) => goals.find(g => g.id === id);

  const handleDeleteTask = async (taskId: string, title: string) => {
    if (window.confirm(`Delete task: "${title}"?`)) {
      await deleteTask(taskId);
    }
  };

  const handleQuickPostpone = async (taskId: string, when: 'tomorrow' | 'in3days' | 'nextWeek') => {
    let targetDate = getTomorrowString();
    if (when === 'in3days') targetDate = addDaysToDate(3);
    if (when === 'nextWeek') targetDate = addDaysToDate(7);

    await postponeTask(taskId, targetDate);
    setOpenPostponeDropdownId(null);
  };

  // Tab counts for quick metrics
  const countToday = tasks.filter(t => t.scheduledDate === todayStr || t.status === 'in_progress').length;
  const countOverdue = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled' && ((t.scheduledDate && t.scheduledDate < todayStr) || (t.dueDate && t.dueDate < todayStr))).length;
  const countInbox = tasks.filter(t => t.status === 'inbox' || (!t.scheduledDate && t.status !== 'completed')).length;

  return (
    <div className="w-full overflow-hidden space-y-8 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800/80 w-full overflow-hidden">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-100 flex items-center gap-2.5 break-words">
            <CheckSquare className="w-7 h-7 text-emerald-400 shrink-0" />
            Task Execution Backlog
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 font-mono mt-1.5 leading-relaxed break-words">
            Actionable execution units with planned vs actual time tracking and priorities.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => openCreateTaskModal({ scheduledDate: activeFilterTab === 'today' ? todayStr : undefined })}
          icon={<Plus className="w-3.5 h-3.5" />}
        >
          New Task
        </Button>
      </div>

      {/* Filter Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto p-2 bg-neutral-900/80 rounded-2xl border border-neutral-800 text-xs">
        {[
          { id: 'today', label: 'Today', badge: countToday > 0 ? countToday : undefined },
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'overdue', label: 'Overdue', badge: countOverdue > 0 ? countOverdue : undefined, badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
          { id: 'inbox', label: 'Inbox', badge: countInbox > 0 ? countInbox : undefined },
          { id: 'completed', label: 'Completed' },
          { id: 'all', label: 'All Tasks' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveFilterTab(tab.id as FilterTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono transition-all cursor-pointer whitespace-nowrap ${
              activeFilterTab === tab.id
                ? 'bg-emerald-400 text-neutral-950 font-bold shadow-sm shadow-emerald-400/20'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  activeFilterTab === tab.id
                    ? 'bg-neutral-950 text-emerald-400'
                    : tab.badgeColor || 'bg-neutral-800 text-neutral-300'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Secondary Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Project Selector */}
        <select
          value={selectedProjectId}
          onChange={e => setSelectedProjectId(e.target.value)}
          className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-3.5 py-2 text-xs text-neutral-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
        >
          <option value="all">All Projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>
              {p.code} - {p.name}
            </option>
          ))}
        </select>

        {/* Priority Selector */}
        <select
          value={selectedPriority}
          onChange={e => setSelectedPriority(e.target.value)}
          className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-3.5 py-2 text-xs text-neutral-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
        >
          <option value="all">All Priorities</option>
          <option value="critical">🔴 Critical Priority</option>
          <option value="high">🟠 High Priority</option>
          <option value="medium">🔵 Medium Priority</option>
          <option value="low">⚪ Low Priority</option>
        </select>

        {/* Life Area Selector */}
        <select
          value={selectedLifeAreaId}
          onChange={e => setSelectedLifeAreaId(e.target.value)}
          className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-3.5 py-2 text-xs text-neutral-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
        >
          <option value="all">All Life Areas</option>
          {lifeAreas.map(a => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        {/* Search Input */}
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search tasks or tags..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-neutral-900 border border-neutral-800 pl-9 pr-3.5 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={
            activeFilterTab === 'overdue'
              ? 'No overdue tasks'
              : activeFilterTab === 'completed'
              ? 'No completed tasks recorded'
              : 'No tasks found'
          }
          description={
            activeFilterTab === 'overdue'
              ? 'Execution is fully aligned. Great discipline!'
              : searchQuery
              ? 'No tasks match your search criteria.'
              : 'Add actionable items with clear deliverables to maintain momentum.'
          }
          action={
            activeFilterTab !== 'completed' && activeFilterTab !== 'overdue' ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => openCreateTaskModal({ scheduledDate: activeFilterTab === 'today' ? todayStr : undefined })}
                icon={<Plus className="w-4 h-4" />}
              >
                Create Task
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredTasks.map(task => {
            const project = getProject(task.projectId);
            const goal = getGoal(task.goalId);
            const isCompleted = task.status === 'completed';
            const isActiveTimer = activeFocusTaskId === task.id;
            const isOverdue =
              !isCompleted &&
              task.status !== 'cancelled' &&
              ((task.scheduledDate && isDateOverdue(task.scheduledDate)) ||
                (task.dueDate && isDateOverdue(task.dueDate)));

            return (
              <Card
                key={task.id}
                variant={isActiveTimer ? 'active' : isCompleted ? 'default' : 'default'}
                className={`p-5 transition-all ${
                  isCompleted ? 'opacity-70 bg-neutral-900/40' : 'hover:border-neutral-700/80'
                } ${isOverdue ? 'border-rose-900/50' : ''}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Checkbox, Title, Badges */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Completion Checkbox */}
                    <button
                      type="button"
                      onClick={() => updateTaskStatus(task.id, isCompleted ? 'planned' : 'completed')}
                      className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                        isCompleted
                          ? 'bg-emerald-400 border-emerald-400 text-neutral-950'
                          : 'border-neutral-700 hover:border-emerald-400 bg-neutral-950'
                      }`}
                      title={isCompleted ? 'Mark uncompleted' : 'Mark completed'}
                    >
                      {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      {/* Title & Status */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-sm sm:text-base font-semibold leading-snug break-words ${
                            isCompleted ? 'line-through text-neutral-500' : 'text-neutral-100'
                          }`}
                        >
                          {task.title}
                        </span>

                        <PriorityBadge priority={task.priority} size="sm" />
                        <CommitmentBadge level={task.commitmentLevel} size="sm" />
                        <StatusBadge status={task.status} size="sm" />
                      </div>

                      {/* Description / Outcome */}
                      {task.description && (
                        <p className="text-xs text-neutral-400 line-clamp-1 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      {/* Domain Metadata Tags (Project, Goal, Tags, Dates) */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-neutral-400">
                        {project && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-neutral-850 border border-neutral-750 text-emerald-300 font-bold flex items-center gap-1">
                            <FolderKanban className="w-3 h-3" />
                            {project.code}: {project.name}
                          </span>
                        )}

                        {goal && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 flex items-center gap-1">
                            <Target className="w-3 h-3 text-emerald-400" />
                            {goal.title}
                          </span>
                        )}

                        {task.scheduledDate && (
                          <span
                            className={`flex items-center gap-1 ${
                              isOverdue ? 'text-rose-400 font-bold' : 'text-neutral-400'
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            Sched: {formatFriendlyDate(task.scheduledDate)}
                            {task.scheduledStartTime && ` @ ${task.scheduledStartTime}`}
                          </span>
                        )}

                        {task.dueDate && (
                          <span
                            className={`flex items-center gap-1 ${
                              task.dueDate < todayStr && !isCompleted ? 'text-rose-400 font-bold' : 'text-neutral-400'
                            }`}
                          >
                            Due: {formatFriendlyDate(task.dueDate)}
                          </span>
                        )}

                        {/* Checklist Counter */}
                        {task.checklist && task.checklist.length > 0 && (
                          <span className="flex items-center gap-1 text-neutral-400">
                            <ListTodo className="w-3 h-3" />
                            {task.checklist.filter(c => c.done).length}/{task.checklist.length} steps
                          </span>
                        )}

                        {/* Tags */}
                        {task.tags?.map(t => (
                          <span key={t} className="text-neutral-500">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Time Tracking & Execution Actions */}
                  <div className="flex items-center justify-between lg:justify-end gap-3.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-neutral-800 shrink-0">
                    {/* Time summary */}
                    <div className="text-right text-xs font-mono">
                      <div className="flex items-center gap-1.5 justify-end">
                        <Clock className="w-3.5 h-3.5 text-neutral-500" />
                        <span className="text-neutral-400">
                          {task.actualMinutes || 0}m / <span className="text-neutral-200">{task.estimatedMinutes}m</span>
                        </span>
                      </div>
                      {(task.actualMinutes || 0) > (task.estimatedMinutes || 0) && (
                        <p className="text-[10px] text-emerald-400 font-bold">Variance Overrun</p>
                      )}
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-1.5 relative">
                      {/* Focus Trigger */}
                      {!isCompleted && (
                        <Button
                          variant={isActiveTimer ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => {
                            if (isActiveTimer) {
                              if (isTimerRunning) pauseFocusSession();
                              else resumeFocusSession();
                            } else {
                              startFocusSession(task.id);
                            }
                          }}
                          icon={
                            isActiveTimer && isTimerRunning ? (
                              <Pause className="w-3.5 h-3.5 fill-current" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current" />
                            )
                          }
                        >
                          <span className="hidden sm:inline">
                            {isActiveTimer ? (isTimerRunning ? 'Active' : 'Resume') : 'Focus'}
                          </span>
                        </Button>
                      )}

                      {/* Quick Postpone Dropdown */}
                      {!isCompleted && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenPostponeDropdownId(
                                openPostponeDropdownId === task.id ? null : task.id
                              )
                            }
                            className="p-2 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-emerald-300 transition-colors cursor-pointer"
                            title="Postpone Task"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>

                          {openPostponeDropdownId === task.id && (
                            <div className="absolute right-0 bottom-full mb-2 w-48 bg-neutral-900 border border-neutral-750 rounded-xl shadow-xl p-1.5 z-30 space-y-0.5 text-xs font-mono">
                              <div className="px-2.5 py-1 text-[10px] font-bold uppercase text-neutral-400 border-b border-neutral-800">
                                Postpone To
                              </div>
                              <button
                                type="button"
                                onClick={() => handleQuickPostpone(task.id, 'tomorrow')}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 text-neutral-200 cursor-pointer"
                              >
                                ☀️ Tomorrow
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickPostpone(task.id, 'in3days')}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 text-neutral-200 cursor-pointer"
                              >
                                ⏳ In 3 Days
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickPostpone(task.id, 'nextWeek')}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 text-neutral-200 cursor-pointer"
                              >
                                🗓️ Next Week
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenPostponeDropdownId(null);
                                  openEditTaskModal(task);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 text-emerald-400 border-t border-neutral-800 cursor-pointer"
                              >
                                Pick Custom Date...
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Edit Task */}
                      <button
                        type="button"
                        onClick={() => openEditTaskModal(task)}
                        className="p-2 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                        title="Edit Task"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Delete Task */}
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id, task.title)}
                        className="p-2 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete Task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline Checklist Items Preview if any */}
                {task.checklist && task.checklist.length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-neutral-800/80 flex flex-wrap items-center gap-2">
                    {task.checklist.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleChecklistItem(task.id, item.id)}
                        className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border flex items-center gap-1.5 cursor-pointer transition-colors ${
                          item.done
                            ? 'bg-neutral-950 border-neutral-850 text-neutral-500 line-through'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                            item.done ? 'bg-emerald-400 border-emerald-400 text-neutral-950' : 'border-neutral-600'
                          }`}
                        >
                          {item.done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <span className="truncate max-w-[160px]">{item.text}</span>
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
