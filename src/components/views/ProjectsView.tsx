import React, { useState } from 'react';
import { useExecution } from '../../context/ExecutionContext';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { PriorityBadge, StatusBadge } from '../common/Badge';
import { ProgressBar } from '../common/ProgressBar';
import { EmptyState } from '../common/EmptyState';
import { Project, ProjectPriority, ProjectStatus, Task } from '../../types/domain';
import { formatFriendlyDate, isDateOverdue } from '../../lib/utils';
import {
  FolderKanban,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Play,
  ArrowRight,
  Search,
  Check,
  Clock,
  Target,
  ChevronDown,
  ChevronRight,
  ListTodo,
} from 'lucide-react';

export const ProjectsView: React.FC = () => {
  const {
    projects,
    tasks,
    goals,
    lifeAreas,
    openCreateProjectModal,
    openEditProjectModal,
    deleteProject,
    openCreateTaskModal,
    openEditTaskModal,
    updateTaskStatus,
    startFocusSession,
    setActiveTab,
  } = useExecution();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  const toggleExpand = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  const filteredProjects = projects.filter(proj => {
    if (statusFilter !== 'all' && proj.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && proj.priority !== priorityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        proj.name.toLowerCase().includes(q) ||
        proj.code?.toLowerCase().includes(q) ||
        proj.description?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getGoal = (goalId?: string) => {
    if (!goalId) return null;
    return goals.find(g => g.id === goalId);
  };

  const getLifeArea = (areaId?: string) => {
    if (!areaId) return null;
    return lifeAreas.find(a => a.id === areaId);
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (window.confirm(`Are you sure you want to archive or remove the project: "${projectName}"?`)) {
      await deleteProject(projectId);
    }
  };

  return (
    <div className="w-full overflow-hidden space-y-8 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800/80 w-full overflow-hidden">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-100 flex items-center gap-2.5 break-words">
            <FolderKanban className="w-7 h-7 text-emerald-400 shrink-0" />
            Active Project Registry
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 font-mono mt-1.5 leading-relaxed break-words">
            Execution initiatives grouped by strategic domain with concrete deliverables.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => openCreateProjectModal()}
          icon={<Plus className="w-4 h-4" />}
          className="rounded-xl"
        >
          New Project
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 bg-neutral-950 rounded-2xl border border-neutral-800 text-xs">
          {[
            { id: 'all', label: 'All Projects' },
            { id: 'active', label: 'Active' },
            { id: 'on_hold', label: 'On Hold' },
            { id: 'completed', label: 'Completed' },
            { id: 'archived', label: 'Archived' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl font-mono transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-emerald-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 py-2 text-xs text-neutral-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="critical">🔴 Critical</option>
            <option value="high">🟠 High</option>
            <option value="medium">🔵 Medium</option>
            <option value="low">⚪ Low</option>
          </select>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-xl bg-neutral-950 border border-neutral-800 pl-9 pr-3.5 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={searchQuery || statusFilter !== 'all' ? 'No matching projects found' : 'No projects registered'}
          description={
            searchQuery || statusFilter !== 'all'
              ? 'Try clearing search or changing the filter options.'
              : 'Create your first project initiative to group tasks and drive measurable progress toward your goals.'
          }
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => openCreateProjectModal()}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create New Project
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map(proj => {
            const projTasks = tasks.filter(t => t.projectId === proj.id);
            const completedTasks = projTasks.filter(t => t.status === 'completed');
            const progressPct = projTasks.length > 0
              ? Math.round((completedTasks.length / projTasks.length) * 100)
              : 0;

            const parentGoal = getGoal(proj.goalId);
            const area = getLifeArea(proj.lifeAreaId || parentGoal?.lifeAreaId);
            const isOverdue = proj.deadline && isDateOverdue(proj.deadline) && proj.status !== 'completed';
            const isExpanded = expandedProjects[proj.id] ?? false;

            return (
              <Card
                key={proj.id}
                className="p-5 flex flex-col justify-between space-y-4 hover:border-neutral-700 transition-colors"
              >
                <div className="space-y-3">
                  {/* Top Metadata Line */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[11px] font-mono font-bold px-2 py-0.5 rounded border border-neutral-700 bg-neutral-950 text-amber-300"
                        style={{ borderColor: proj.color ? `${proj.color}50` : undefined }}
                      >
                        {proj.code}
                      </span>
                      <PriorityBadge priority={proj.priority} size="sm" />
                    </div>

                    <StatusBadge status={proj.status} size="sm" />
                  </div>

                  {/* Project Name & Outcome Description */}
                  <div>
                    <h3 className="text-base font-bold text-neutral-100 leading-snug break-words">{proj.name}</h3>
                    {proj.description && (
                      <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed break-words">
                        {proj.description}
                      </p>
                    )}
                  </div>

                  {/* Strategic Goal & Life Area Tags */}
                  {(parentGoal || area) && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {parentGoal && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 flex items-center gap-1">
                          <Target className="w-3 h-3 text-amber-400" />
                          {parentGoal.title}
                        </span>
                      )}
                      {area && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
                          {area.name}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Progress Milestone Bar */}
                  <div className="p-3 bg-neutral-950/60 rounded-lg border border-neutral-850 space-y-2">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-neutral-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-amber-400" />
                        Task Execution
                      </span>
                      <span className="text-neutral-200 font-bold">
                        {completedTasks.length} / {projTasks.length} Done ({progressPct}%)
                      </span>
                    </div>
                    <ProgressBar value={progressPct} variant="amber" size="sm" />
                  </div>

                  {/* Deadline */}
                  <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
                    <span>Target Completion:</span>
                    <span className={`font-semibold ${isOverdue ? 'text-rose-400 font-bold' : 'text-neutral-300'}`}>
                      {proj.deadline ? formatFriendlyDate(proj.deadline) : 'Continuous Initiative'}
                      {isOverdue && ' (Overdue)'}
                    </span>
                  </div>

                  {/* Associated Tasks Section (Collapsible) */}
                  <div className="pt-2 border-t border-neutral-850">
                    <button
                      type="button"
                      onClick={() => toggleExpand(proj.id)}
                      className="w-full flex items-center justify-between text-xs font-mono text-neutral-400 hover:text-neutral-200 py-1 cursor-pointer"
                    >
                      <span className="flex items-center gap-1 font-semibold">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        Associated Tasks ({projTasks.length})
                      </span>
                      <span className="text-[11px] text-amber-400 hover:underline">
                        {isExpanded ? 'Hide' : 'Show Tasks'}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {projTasks.length === 0 ? (
                          <p className="text-[11px] font-mono text-neutral-500 italic py-2 text-center">
                            No tasks created for this project yet.
                          </p>
                        ) : (
                          projTasks.map(task => (
                            <div
                              key={task.id}
                              className="flex items-center justify-between gap-2 p-1.5 rounded bg-neutral-950 border border-neutral-850 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateTaskStatus(
                                      task.id,
                                      task.status === 'completed' ? 'planned' : 'completed'
                                    )
                                  }
                                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 cursor-pointer ${
                                    task.status === 'completed'
                                      ? 'bg-amber-500 border-amber-500 text-neutral-950'
                                      : 'border-neutral-700 hover:border-neutral-500'
                                  }`}
                                >
                                  {task.status === 'completed' && <Check className="w-3 h-3 stroke-[3]" />}
                                </button>
                                <span
                                  className={`truncate ${
                                    task.status === 'completed' ? 'line-through text-neutral-500' : 'text-neutral-200'
                                  }`}
                                >
                                  {task.title}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {task.status !== 'completed' && (
                                  <button
                                    type="button"
                                    onClick={() => startFocusSession(task.id)}
                                    className="p-1 rounded text-neutral-400 hover:text-amber-400 cursor-pointer"
                                    title="Start Focus Session"
                                  >
                                    <Play className="w-3 h-3 fill-current" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openEditTaskModal(task)}
                                  className="p-1 rounded text-neutral-400 hover:text-neutral-200 cursor-pointer"
                                  title="Edit Task"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditProjectModal(proj)}
                      className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                      title="Edit Project"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteProject(proj.id, proj.name)}
                      className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Delete Project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openCreateTaskModal({ projectId: proj.id, goalId: proj.goalId, lifeAreaId: proj.lifeAreaId })}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add Task
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
