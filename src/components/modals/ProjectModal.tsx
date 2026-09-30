import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input, Textarea, Select } from '../common/Input';
import { useExecution } from '../../context/ExecutionContext';
import { ProjectPriority, ProjectStatus } from '../../types/domain';
import { addDaysToDate } from '../../lib/utils';
import { FolderKanban, Check, Plus } from 'lucide-react';

const COLOR_PRESETS = [
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Sky', value: '#0ea5e9' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Purple', value: '#a855f7' },
];

export const ProjectModal: React.FC = () => {
  const {
    isProjectModalOpen,
    closeProjectModal,
    editingProject,
    projectModalDefaults,
    createProject,
    updateProject,
    goals,
    lifeAreas,
  } = useExecution();

  const isEditing = Boolean(editingProject);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [goalId, setGoalId] = useState('');
  const [lifeAreaId, setLifeAreaId] = useState('');
  const [priority, setPriority] = useState<ProjectPriority>('high');
  const [status, setStatus] = useState<ProjectStatus>('active');
  const [color, setColor] = useState('#f59e0b');
  const [deadline, setDeadline] = useState(addDaysToDate(45));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isProjectModalOpen) return;

    if (editingProject) {
      setName(editingProject.name || '');
      setCode(editingProject.code || '');
      setDescription(editingProject.description || '');
      setGoalId(editingProject.goalId || '');
      setLifeAreaId(editingProject.lifeAreaId || '');
      setPriority(editingProject.priority || 'high');
      setStatus(editingProject.status || 'active');
      setColor(editingProject.color || '#f59e0b');
      setDeadline(editingProject.deadline || addDaysToDate(45));
    } else {
      const def = projectModalDefaults || {};
      setName(def.name || '');
      setCode(def.code || '');
      setDescription(def.description || '');
      setGoalId(def.goalId || (goals.length > 0 ? goals[0].id : ''));
      setLifeAreaId(def.lifeAreaId || (lifeAreas.length > 0 ? lifeAreas[0].id : ''));
      setPriority(def.priority || 'high');
      setStatus(def.status || 'active');
      setColor(def.color || '#f59e0b');
      setDeadline(def.deadline || addDaysToDate(45));
    }
    setError(null);
  }, [isProjectModalOpen, editingProject, projectModalDefaults, goals, lifeAreas]);

  // Auto-generate code from name if empty
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing && (!code || code === generateProjectCode(name))) {
      setCode(generateProjectCode(val));
    }
  };

  const generateProjectCode = (str: string) => {
    const cleaned = str.replace(/[^a-zA-Z0-9 ]/g, '').trim();
    if (!cleaned) return '';
    const parts = cleaned.split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 4).toUpperCase();
    }
    return parts.map(p => p[0]).join('').substring(0, 4).toUpperCase();
  };

  // When goal changes, auto-link life area
  const handleGoalChange = (newGoalId: string) => {
    setGoalId(newGoalId);
    if (newGoalId) {
      const g = goals.find(goal => goal.id === newGoalId);
      if (g && g.lifeAreaId) {
        setLifeAreaId(g.lifeAreaId);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const generatedCode = code.trim() || generateProjectCode(name) || 'PRJ';

      const payload = {
        name: name.trim(),
        code: generatedCode,
        description: description.trim() || undefined,
        goalId: goalId || undefined,
        lifeAreaId: lifeAreaId || undefined,
        priority,
        status,
        color,
        deadline: deadline || undefined,
      };

      if (isEditing && editingProject) {
        await updateProject(editingProject.id, payload);
      } else {
        await createProject(payload);
      }

      closeProjectModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isProjectModalOpen}
      onClose={closeProjectModal}
      title={isEditing ? 'Edit Project' : 'Create New Project'}
      subtitle="Define a structured project initiative with clear desired outcomes."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              label="Project Name *"
              placeholder="e.g. NICK OS Architecture & Engine"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              error={error || undefined}
              autoFocus
            />
          </div>
          <Input
            label="Project Code"
            placeholder="e.g. NOS"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            helperText="Short identifier."
          />
        </div>

        <Textarea
          label="Desired Outcome & Deliverable Description"
          placeholder="What specific outcome will mark this project as successfully completed?"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Parent Goal"
            value={goalId}
            onChange={e => handleGoalChange(e.target.value)}
            options={[
              { label: 'None (Standalone Project)', value: '' },
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Priority"
            value={priority}
            onChange={e => setPriority(e.target.value as ProjectPriority)}
            options={[
              { label: '🔴 Critical Priority', value: 'critical' },
              { label: '🟠 High Priority', value: 'high' },
              { label: '🔵 Medium Priority', value: 'medium' },
              { label: '⚪ Low Priority', value: 'low' },
            ]}
          />

          <Select
            label="Project Status"
            value={status}
            onChange={e => setStatus(e.target.value as ProjectStatus)}
            options={[
              { label: '⚡ Active', value: 'active' },
              { label: '⏸️ On Hold', value: 'on_hold' },
              { label: '✅ Completed', value: 'completed' },
              { label: '📦 Archived', value: 'archived' },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            type="date"
            label="Target Completion Date"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
          />

          {/* Color Tag Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider font-mono">
              Project Color Accent
            </label>
            <div className="flex items-center gap-2 pt-1">
              {COLOR_PRESETS.map(c => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-7 h-7 rounded-full transition-transform cursor-pointer border ${
                    color === c.value
                      ? 'scale-110 border-white ring-2 ring-amber-500/50'
                      : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
          <Button type="button" variant="ghost" size="md" onClick={closeProjectModal}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            leftIcon={isEditing ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          >
            {isEditing ? 'Save Changes' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
