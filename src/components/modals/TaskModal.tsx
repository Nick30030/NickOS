import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input, Textarea, Select } from '../common/Input';
import { useExecution } from '../../context/ExecutionContext';
import { TaskPriority, CommitmentLevel, TaskStatus } from '../../types/domain';
import { getTodayString, getTomorrowString, addDaysToDate } from '../../lib/utils';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  Calendar,
  Layers,
  Target,
  FolderKanban,
  Check,
  AlertCircle,
} from 'lucide-react';

const DURATION_PRESETS = [15, 25, 45, 60, 90, 120];

export const TaskModal: React.FC = () => {
  const {
    isTaskModalOpen,
    closeTaskModal,
    editingTask,
    taskModalDefaults,
    createTask,
    updateTask,
    projects,
    goals,
    lifeAreas,
  } = useExecution();

  const isEditing = Boolean(editingTask);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('planned');
  const [priority, setPriority] = useState<TaskPriority>('high');
  const [commitmentLevel, setCommitmentLevel] = useState<CommitmentLevel>('hard_commitment');
  const [estimatedMinutes, setEstimatedMinutes] = useState(45);
  const [scheduledDate, setScheduledDate] = useState(getTodayString());
  const [scheduledStartTime, setScheduledStartTime] = useState('09:00');
  const [scheduledEndTime, setScheduledEndTime] = useState('09:45');
  const [dueDate, setDueDate] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [goalId, setGoalId] = useState<string>('');
  const [lifeAreaId, setLifeAreaId] = useState<string>('');
  const [tagsInput, setTagsInput] = useState('');
  const [checklist, setChecklist] = useState<{ id: string; text: string; done: boolean }[]>([]);
  const [newCheckItem, setNewCheckItem] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize or reset form when modal opens or target changes
  useEffect(() => {
    if (!isTaskModalOpen) return;

    if (editingTask) {
      setTitle(editingTask.title || '');
      setDescription(editingTask.description || '');
      setStatus(editingTask.status || 'planned');
      setPriority(editingTask.priority || 'medium');
      setCommitmentLevel(editingTask.commitmentLevel || 'flexible');
      setEstimatedMinutes(editingTask.estimatedMinutes || 45);
      setScheduledDate(editingTask.scheduledDate || '');
      setScheduledStartTime(editingTask.scheduledStartTime || '');
      setScheduledEndTime(editingTask.scheduledEndTime || '');
      setDueDate(editingTask.dueDate || '');
      setProjectId(editingTask.projectId || '');
      setGoalId(editingTask.goalId || '');
      setLifeAreaId(editingTask.lifeAreaId || '');
      setTagsInput(editingTask.tags ? editingTask.tags.join(', ') : '');
      setChecklist(editingTask.checklist ? [...editingTask.checklist] : []);
    } else {
      // Create mode - apply defaults if any
      const def = taskModalDefaults || {};
      setTitle(def.title || '');
      setDescription(def.description || '');
      setStatus(def.status || 'planned');
      setPriority(def.priority || 'high');
      setCommitmentLevel(def.commitmentLevel || 'hard_commitment');
      setEstimatedMinutes(def.estimatedMinutes || 45);
      setScheduledDate(def.scheduledDate !== undefined ? def.scheduledDate : getTodayString());
      setScheduledStartTime(def.scheduledStartTime || '09:00');
      setScheduledEndTime(def.scheduledEndTime || '09:45');
      setDueDate(def.dueDate || '');
      
      const defaultProj = def.projectId || (projects.length > 0 ? projects[0].id : '');
      setProjectId(defaultProj);

      // Auto-derive goal and life area from project if set
      if (defaultProj) {
        const foundProj = projects.find(p => p.id === defaultProj);
        setGoalId(def.goalId || foundProj?.goalId || (goals.length > 0 ? goals[0].id : ''));
        setLifeAreaId(def.lifeAreaId || foundProj?.lifeAreaId || (lifeAreas.length > 0 ? lifeAreas[0].id : ''));
      } else {
        setGoalId(def.goalId || (goals.length > 0 ? goals[0].id : ''));
        setLifeAreaId(def.lifeAreaId || (lifeAreas.length > 0 ? lifeAreas[0].id : ''));
      }

      setTagsInput(def.tags ? def.tags.join(', ') : 'execution');
      setChecklist(def.checklist ? [...def.checklist] : []);
    }
    setError(null);
    setNewCheckItem('');
  }, [isTaskModalOpen, editingTask, taskModalDefaults, projects, goals, lifeAreas]);

  // When project changes, automatically suggest associated goal and life area
  const handleProjectChange = (newProjId: string) => {
    setProjectId(newProjId);
    if (newProjId) {
      const proj = projects.find(p => p.id === newProjId);
      if (proj) {
        if (proj.goalId) setGoalId(proj.goalId);
        if (proj.lifeAreaId) setLifeAreaId(proj.lifeAreaId);
      }
    }
  };

  const handleAddChecklist = () => {
    if (!newCheckItem.trim()) return;
    setChecklist(prev => [...prev, { id: String(Date.now()), text: newCheckItem.trim(), done: false }]);
    setNewCheckItem('');
  };

  const handleToggleChecklist = (id: string) => {
    setChecklist(prev =>
      prev.map(c => (c.id === id ? { ...c, done: !c.done } : c))
    );
  };

  const handleRemoveChecklist = (id: string) => {
    setChecklist(prev => prev.filter(c => c.id !== id));
  };

  const handlePresetDuration = (mins: number) => {
    setEstimatedMinutes(mins);
  };

  const handleQuickSchedule = (when: 'today' | 'tomorrow' | 'in3days' | 'nextWeek' | 'clear') => {
    if (when === 'today') setScheduledDate(getTodayString());
    else if (when === 'tomorrow') setScheduledDate(getTomorrowString());
    else if (when === 'in3days') setScheduledDate(addDaysToDate(3));
    else if (when === 'nextWeek') setScheduledDate(addDaysToDate(7));
    else if (when === 'clear') setScheduledDate('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required. Be specific and actionable.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const parsedTags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const taskPayload = {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        commitmentLevel,
        estimatedMinutes: Number(estimatedMinutes) || 30,
        actualMinutes: editingTask ? editingTask.actualMinutes : 0,
        scheduledDate: scheduledDate || undefined,
        scheduledStartTime: scheduledStartTime || undefined,
        scheduledEndTime: scheduledEndTime || undefined,
        dueDate: dueDate || undefined,
        projectId: projectId || undefined,
        goalId: goalId || undefined,
        lifeAreaId: lifeAreaId || undefined,
        tags: parsedTags,
        checklist,
      };

      if (isEditing && editingTask) {
        await updateTask(editingTask.id, taskPayload);
      } else {
        await createTask(taskPayload);
      }

      closeTaskModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isTaskModalOpen}
      onClose={closeTaskModal}
      title={isEditing ? 'Edit Actionable Task' : 'Create Actionable Task'}
      subtitle="Define precise, concrete execution targets with clear outcomes."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
        {/* Title Input with Quality Prompt */}
        <div className="space-y-1">
          <Input
            label="Task Action & Deliverable *"
            placeholder="e.g. Implement the Workspace sidebar navigation"
            value={title}
            onChange={e => setTitle(e.target.value)}
            error={error || undefined}
            autoFocus
          />
          <p className="text-[11px] text-neutral-400 font-mono">
            Tip: Use actionable verbs and specific outputs. Avoid vague notes like "Work on app".
          </p>
        </div>

        {/* Definition of Done / Outcome Description */}
        <Textarea
          label="Outcome & Definition of Done"
          placeholder="Define what 'done' means (e.g., Pull request merged, tests green, documentation published)..."
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
        />

        {/* Priority & Status Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Priority"
            value={priority}
            onChange={e => setPriority(e.target.value as TaskPriority)}
            options={[
              { label: '🔴 Critical (Execution Blocker)', value: 'critical' },
              { label: '🟠 High Priority', value: 'high' },
              { label: '🔵 Medium Priority', value: 'medium' },
              { label: '⚪ Low Priority', value: 'low' },
            ]}
          />

          <Select
            label="Commitment Level"
            value={commitmentLevel}
            onChange={e => setCommitmentLevel(e.target.value as CommitmentLevel)}
            options={[
              { label: '⚡ Hard Commitment (Non-negotiable)', value: 'hard_commitment' },
              { label: '⏱️ Flexible (Planned today)', value: 'flexible' },
              { label: '🎯 Stretch (Bonus bandwidth)', value: 'stretch' },
            ]}
          />

          <Select
            label="Execution Status"
            value={status}
            onChange={e => setStatus(e.target.value as TaskStatus)}
            options={[
              { label: 'Planned / Ready', value: 'planned' },
              { label: 'In Progress', value: 'in_progress' },
              { label: 'Inbox / Backlog', value: 'inbox' },
              { label: 'Postponed', value: 'postponed' },
              { label: 'Completed', value: 'completed' },
              { label: 'Cancelled', value: 'cancelled' },
            ]}
          />
        </div>

        {/* Duration with Fast Preset Chips */}
        <div className="space-y-1.5 p-3 rounded-lg bg-neutral-900/60 border border-neutral-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider font-mono">
              Estimated Duration: <span className="text-amber-400 font-bold">{estimatedMinutes} min</span>
            </label>
            <span className="text-[11px] text-neutral-400 font-mono">Quick select:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {DURATION_PRESETS.map(mins => (
              <button
                type="button"
                key={mins}
                onClick={() => handlePresetDuration(mins)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${
                  estimatedMinutes === mins
                    ? 'bg-amber-500 text-neutral-950 font-bold'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                {mins}m
              </button>
            ))}
            <div className="ml-auto w-24">
              <input
                type="number"
                min={5}
                max={600}
                step={5}
                value={estimatedMinutes}
                onChange={e => setEstimatedMinutes(Number(e.target.value))}
                className="w-full text-xs font-mono px-2 py-1 rounded bg-neutral-950 border border-neutral-700 text-neutral-100 text-right focus:border-amber-500 focus:outline-none"
                placeholder="Custom"
              />
            </div>
          </div>
        </div>

        {/* Scheduling & Dates */}
        <div className="space-y-2 p-3 rounded-lg bg-neutral-900/60 border border-neutral-800">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider font-mono">
              Schedule & Target Times
            </label>
            <div className="flex items-center gap-1 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => handleQuickSchedule('today')}
                className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-300 cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleQuickSchedule('tomorrow')}
                className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer"
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => handleQuickSchedule('in3days')}
                className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer"
              >
                +3d
              </button>
              <button
                type="button"
                onClick={() => handleQuickSchedule('clear')}
                className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <Input
              type="date"
              label="Scheduled Date"
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
            />
            <Input
              type="time"
              label="Start Time"
              value={scheduledStartTime}
              onChange={e => setScheduledStartTime(e.target.value)}
            />
            <Input
              type="date"
              label="Due Date (Hard Deadline)"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>
        </div>

        {/* Hierarchical Domain Links (Project / Goal / Life Area) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Project"
            value={projectId}
            onChange={e => handleProjectChange(e.target.value)}
            options={[
              { label: 'None (Standalone Task)', value: '' },
              ...projects.map(p => ({ label: `${p.code} - ${p.name}`, value: p.id })),
            ]}
          />

          <Select
            label="Strategic Goal"
            value={goalId}
            onChange={e => setGoalId(e.target.value)}
            options={[
              { label: 'None (Unassigned)', value: '' },
              ...goals.map(g => ({ label: g.title, value: g.id })),
            ]}
          />

          <Select
            label="Life Area"
            value={lifeAreaId}
            onChange={e => setLifeAreaId(e.target.value)}
            options={[
              { label: 'None (Unassigned)', value: '' },
              ...lifeAreas.map(a => ({ label: a.name, value: a.id })),
            ]}
          />
        </div>

        {/* Checklist Steps */}
        <div className="space-y-2 p-3 rounded-lg bg-neutral-900/60 border border-neutral-800">
          <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider font-mono">
            Execution Checklist ({checklist.filter(c => c.done).length}/{checklist.length} done)
          </label>

          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {checklist.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 p-1.5 rounded bg-neutral-950 border border-neutral-850 text-xs"
              >
                <div
                  className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                  onClick={() => handleToggleChecklist(item.id)}
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      item.done
                        ? 'bg-amber-500 border-amber-500 text-neutral-950'
                        : 'border-neutral-700 hover:border-neutral-500'
                    }`}
                  >
                    {item.done && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span
                    className={`truncate ${
                      item.done ? 'text-neutral-500 line-through' : 'text-neutral-200'
                    }`}
                  >
                    {item.text}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveChecklist(item.id)}
                  className="text-neutral-500 hover:text-rose-400 p-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <input
              type="text"
              placeholder="Add checklist step (e.g. Write integration test)..."
              value={newCheckItem}
              onChange={e => setNewCheckItem(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddChecklist();
                }
              }}
              className="flex-1 rounded-lg bg-neutral-950 border border-neutral-800 px-3 py-1.5 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddChecklist}
              disabled={!newCheckItem.trim()}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Step
            </Button>
          </div>
        </div>

        {/* Tags */}
        <Input
          label="Tags"
          placeholder="e.g. backend, database, sprint-1"
          value={tagsInput}
          onChange={e => setTagsInput(e.target.value)}
          helperText="Comma separated tags for quick categorization."
        />

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
          <Button type="button" variant="ghost" size="md" onClick={closeTaskModal}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            leftIcon={isEditing ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          >
            {isEditing ? 'Save Changes' : 'Commit Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
