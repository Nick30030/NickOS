import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input, Textarea, Select } from '../common/Input';
import { useExecution } from '../../context/ExecutionContext';
import { GoalCategory, GoalStatus } from '../../types/domain';
import { getTodayString, addDaysToDate } from '../../lib/utils';
import { Target, Check, Plus, AlertCircle } from 'lucide-react';

export const GoalModal: React.FC = () => {
  const {
    isGoalModalOpen,
    closeGoalModal,
    editingGoal,
    goalModalDefaults,
    createGoal,
    updateGoal,
    lifeAreas,
  } = useExecution();

  const isEditing = Boolean(editingGoal);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lifeAreaId, setLifeAreaId] = useState('');
  const [category, setCategory] = useState<GoalCategory>('quarterly');
  const [targetValue, setTargetValue] = useState<number>(100);
  const [currentValue, setCurrentValue] = useState<number>(0);
  const [metricUnit, setMetricUnit] = useState('%');
  const [deadline, setDeadline] = useState(addDaysToDate(90));
  const [status, setStatus] = useState<GoalStatus>('on_track');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isGoalModalOpen) return;

    if (editingGoal) {
      setTitle(editingGoal.title || '');
      setDescription(editingGoal.description || '');
      setLifeAreaId(editingGoal.lifeAreaId || '');
      setCategory(editingGoal.category || 'quarterly');
      setTargetValue(editingGoal.targetValue ?? 100);
      setCurrentValue(editingGoal.currentValue ?? 0);
      setMetricUnit(editingGoal.metricUnit || '%');
      setDeadline(editingGoal.deadline || addDaysToDate(90));
      setStatus(editingGoal.status || 'on_track');
    } else {
      const def = goalModalDefaults || {};
      setTitle(def.title || '');
      setDescription(def.description || '');
      setLifeAreaId(def.lifeAreaId || (lifeAreas.length > 0 ? lifeAreas[0].id : ''));
      setCategory(def.category || 'quarterly');
      setTargetValue(def.targetValue ?? 100);
      setCurrentValue(def.currentValue ?? 0);
      setMetricUnit(def.metricUnit || '%');
      setDeadline(def.deadline || addDaysToDate(90));
      setStatus(def.status || 'on_track');
    }
    setError(null);
  }, [isGoalModalOpen, editingGoal, goalModalDefaults, lifeAreas]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Goal title is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        lifeAreaId: lifeAreaId || undefined,
        category,
        targetValue: Number(targetValue) || 100,
        currentValue: Number(currentValue) || 0,
        metricUnit: metricUnit.trim() || '%',
        deadline: deadline || addDaysToDate(90),
        status,
      };

      if (isEditing && editingGoal) {
        await updateGoal(editingGoal.id, payload);
      } else {
        await createGoal(payload);
      }

      closeGoalModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isGoalModalOpen}
      onClose={closeGoalModal}
      title={isEditing ? 'Edit Strategic Goal' : 'Define Strategic Goal'}
      subtitle="Establish clear high-level targets to frame your daily execution requirements."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Goal Title *"
          placeholder="e.g. Launch NICK OS Foundation & Data Architecture"
          value={title}
          onChange={e => setTitle(e.target.value)}
          error={error || undefined}
          autoFocus
        />

        <Textarea
          label="Description & Strategic Value"
          placeholder="Why does this goal matter and what is the key strategic outcome?"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Life Area"
            value={lifeAreaId}
            onChange={e => setLifeAreaId(e.target.value)}
            options={[
              { label: 'Select Life Area...', value: '' },
              ...lifeAreas.map(a => ({ label: a.name, value: a.id })),
            ]}
          />

          <Select
            label="Horizon / Category"
            value={category}
            onChange={e => setCategory(e.target.value as GoalCategory)}
            options={[
              { label: 'Quarterly Target', value: 'quarterly' },
              { label: 'Annual Goal', value: 'annual' },
              { label: 'Recurring Habit / Standard', value: 'habit' },
              { label: 'Operational Objective', value: 'operational' },
            ]}
          />
        </div>

        {/* Target Metric & Current Value */}
        <div className="p-3 bg-neutral-900/60 rounded-lg border border-neutral-800 space-y-3">
          <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider font-mono">
            Metric & Target Milestone
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              type="number"
              label="Target Value"
              value={targetValue}
              onChange={e => setTargetValue(Number(e.target.value))}
              min={1}
            />
            <Input
              type="number"
              label="Current Progress"
              value={currentValue}
              onChange={e => setCurrentValue(Number(e.target.value))}
              min={0}
            />
            <Input
              label="Metric Unit"
              placeholder="%, days, sessions, etc."
              value={metricUnit}
              onChange={e => setMetricUnit(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            type="date"
            label="Target Date / Deadline"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
          />

          <Select
            label="Execution Status"
            value={status}
            onChange={e => setStatus(e.target.value as GoalStatus)}
            options={[
              { label: '🟢 On Track', value: 'on_track' },
              { label: '🟡 At Risk', value: 'at_risk' },
              { label: '🔴 Behind Target', value: 'behind' },
              { label: '🏆 Achieved / Completed', value: 'achieved' },
            ]}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
          <Button type="button" variant="ghost" size="md" onClick={closeGoalModal}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            leftIcon={isEditing ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          >
            {isEditing ? 'Save Changes' : 'Create Goal'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
