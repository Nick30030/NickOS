import React, { useState, useEffect } from 'react';
import { useExecution } from '../../context/ExecutionContext';
import { getRepository } from '../../services/storage';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Task, AiProposal, PlanningProposal, TaskSuggestion, DailyAnalysis } from '../../types/domain';
import { getTodayString, generateId } from '../../lib/utils';
import { AdaptiveLearningService } from '../../services/adaptive/AdaptiveLearningService';
import {
  Brain,
  Sparkles,
  Play,
  RotateCw,
  Compass,
  AlertOctagon,
  CheckCircle,
  XCircle,
  Clock,
  Check,
  Plus,
  HelpCircle,
  HelpCircle as QuestionIcon,
  ChevronRight,
  Split,
  Maximize2,
  Calendar,
  AlertTriangle,
  History,
  Trash,
  CheckSquare,
  Zap,
} from 'lucide-react';

export const AiBrainView: React.FC = () => {
  const {
    tasks,
    todayPlan,
    timeBlocks,
    goals,
    projects,
    aiProposals,
    createAiProposal,
    updateAiProposalStatus,
    buildCompactContext,
    updateTask,
    refreshData,
    createTimeBlock,
    userProfile,
    behaviorProfile,
    transparencyInsights,
  } = useExecution();

  // Selected Task for Reasoning & Breakdown & Blocker
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [blockerReason, setBlockerReason] = useState<string>('');
  
  // Loading states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Active Screen Panel
  const [activePanel, setActivePanel] = useState<'planner' | 'cockpit' | 'breakdown' | 'unblocker' | 'history'>('planner');
  
  // Output states
  const [currentProposal, setCurrentProposal] = useState<AiProposal | null>(null);
  const [cockpitReasoning, setCockpitReasoning] = useState<{
    why_it_matters: string;
    tangible_outcome: string;
    first_action: string;
    sub_steps: string[];
    focus_strategy: string;
  } | null>(null);
  const [taskBreakdown, setTaskBreakdown] = useState<{
    explanation: string;
    suggested_checklist: string[];
    estimated_minutes: number;
  } | null>(null);
  const [blockerResolution, setBlockerResolution] = useState<{
    assessment: string;
    first_action: string;
    decisions_needed: string[];
    alternate_paths: string[];
  } | null>(null);
  const [replanOutput, setReplanOutput] = useState<{
    explanation: string;
    suggested_time_blocks: {
      title: string;
      blockType: string;
      startTime: string;
      endTime: string;
      taskId?: string;
    }[];
  } | null>(null);

  // Default to first incomplete task if selectedTaskId is empty
  useEffect(() => {
    const incomplete = tasks.find(t => t.status === 'todo' || t.status === 'in_progress');
    if (incomplete && !selectedTaskId) {
      setSelectedTaskId(incomplete.id);
    }
  }, [tasks, selectedTaskId]);

  const activeTaskObj = tasks.find(t => t.id === selectedTaskId) || null;

  // 1. Trigger "Plan my Day"
  const handlePlanDay = async () => {
    setIsLoading(true);
    setApiError(null);
    setCurrentProposal(null);
    try {
      const context = buildCompactContext();
      const res = await fetch('/api/ai/plan-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to generate plan.');
      }

      const proposalPayload = await res.json();
      
      // Save AI Proposal in LocalStorage audit trail
      const proposal = await createAiProposal({
        type: 'day_plan',
        payload: proposalPayload,
        explanation: proposalPayload.reason || proposalPayload.explanation,
        status: 'pending',
      });
      
      setCurrentProposal(proposal);
      setActivePanel('planner');
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || 'An unexpected error occurred during day planning.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Trigger "What should I do now?" reasoning
  const handleCockpitReasoning = async () => {
    if (!activeTaskObj) {
      setApiError('Please select a task first.');
      return;
    }
    setIsLoading(true);
    setApiError(null);
    setCockpitReasoning(null);
    try {
      const context = buildCompactContext();
      const res = await fetch('/api/ai/now-reasoning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: activeTaskObj, context }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to generate reasoning.');
      }

      const data = await res.json();
      setCockpitReasoning(data);
      setActivePanel('cockpit');
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || 'An unexpected error occurred during reasoning.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Trigger "Break task down"
  const handleBreakDown = async () => {
    if (!activeTaskObj) {
      setApiError('Please select a task first.');
      return;
    }
    setIsLoading(true);
    setApiError(null);
    setTaskBreakdown(null);
    try {
      const res = await fetch('/api/ai/break-down', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskTitle: activeTaskObj.title,
          taskDescription: activeTaskObj.description,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to generate checklist.');
      }

      const data = await res.json();
      setTaskBreakdown(data);
      setActivePanel('breakdown');
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || 'An unexpected error occurred during task breakdown.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Trigger "I'm blocked"
  const handleBlocked = async () => {
    if (!activeTaskObj) {
      setApiError('Please select a task first.');
      return;
    }
    setIsLoading(true);
    setApiError(null);
    setBlockerResolution(null);
    try {
      const res = await fetch('/api/ai/blocked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: activeTaskObj,
          blockerReason: blockerReason,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to generate unblock action plan.');
      }

      const data = await res.json();
      setBlockerResolution(data);
      setActivePanel('unblocker');
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || 'An unexpected error occurred during unblocking analysis.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Trigger "Replan"
  const handleReplan = async () => {
    setIsLoading(true);
    setApiError(null);
    setReplanOutput(null);
    try {
      const context = buildCompactContext();
      const nowString = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const res = await fetch('/api/ai/replan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, currentTime: nowString }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to generate replan proposal.');
      }

      const payload = await res.json();
      
      const proposal = await createAiProposal({
        type: 'replan',
        payload: payload,
        explanation: payload.explanation,
        status: 'pending',
      });

      setCurrentProposal(proposal);
      setReplanOutput(payload);
      setActivePanel('planner');
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || 'An unexpected error occurred during replanning.');
    } finally {
      setIsLoading(false);
    }
  };

  // Approval Handlers
  const handleApprovePlan = async (proposalId: string) => {
    if (!currentProposal) return;
    try {
      const payload = currentProposal.payload as PlanningProposal;
      
      // 1. Overwrite Day Plan
      const storageRepo = getRepository();
      
      const dayPlan = await storageRepo.saveDayPlan({
        date: getTodayString(),
        status: 'confirmed',
        generatedByAi: true,
        approvedByUser: true,
        confirmedByNick: true,
        confirmedAt: new Date().toISOString(),
        plannedTaskIds: payload.task_ids,
        totalPlannedMinutes: payload.time_blocks.reduce((acc, tb) => acc + 30, 0), // rough estimate
        totalActualMinutes: 0,
      });

      // 2. Add time blocks
      // Delete existing blocks first to avoid duplicates
      const existingBlocks = await storageRepo.getTimeBlocks(dayPlan.id);
      for (const b of existingBlocks) {
        await storageRepo.deleteTimeBlock(b.id);
      }

      // Create new blocks
      for (const block of payload.time_blocks) {
        await storageRepo.createTimeBlock({
          dailyPlanId: dayPlan.id,
          title: block.title,
          blockType: block.blockType as any,
          startTime: block.startTime,
          endTime: block.endTime,
          status: 'scheduled',
          taskId: block.taskId,
        });
      }

      // Mark proposal approved
      await updateAiProposalStatus(proposalId, 'approved');
      
      // Refresh context state
      await refreshData();
      alert('AI Day Plan successfully approved and applied to your Today schedule!');
    } catch (err: any) {
      console.error(err);
      alert('Error applying proposal: ' + err.message);
    }
  };

  const handleApproveReplan = async (proposalId: string) => {
    if (!currentProposal || !replanOutput) return;
    try {
      const storageRepo = getRepository();
      const planId = todayPlan?.id || `plan-${getTodayString()}`;

      // Overwrite remaining blocks
      // Clear all scheduled or planned time blocks
      const existingBlocks = await storageRepo.getTimeBlocks(planId);
      for (const b of existingBlocks) {
        if (b.status === 'scheduled' || b.status === 'planned') {
          await storageRepo.deleteTimeBlock(b.id);
        }
      }

      // Create new replanned blocks
      for (const block of replanOutput.suggested_time_blocks) {
        await storageRepo.createTimeBlock({
          dailyPlanId: planId,
          title: block.title,
          blockType: block.blockType as any,
          startTime: block.startTime,
          endTime: block.endTime,
          status: 'scheduled',
          taskId: block.taskId,
        });
      }

      await updateAiProposalStatus(proposalId, 'approved');
      await refreshData();
      alert('AI Replan successfully applied!');
    } catch (err: any) {
      console.error(err);
      alert('Error applying replan: ' + err.message);
    }
  };

  const handleRejectProposal = async (proposalId: string) => {
    try {
      await updateAiProposalStatus(proposalId, 'rejected');
      if (currentProposal) {
        setCurrentProposal({ ...currentProposal, status: 'rejected' });
      }
      alert('Proposal marked rejected.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleApplyChecklistToTask = async () => {
    if (!activeTaskObj || !taskBreakdown) return;
    try {
      const existingChecklist = activeTaskObj.checklist || [];
      const newItems = taskBreakdown.suggested_checklist.map(item => ({
        id: 'chk-' + generateId(),
        text: item,
        done: false,
      }));

      await updateTask(activeTaskObj.id, {
        checklist: [...existingChecklist, ...newItems],
        estimatedMinutes: taskBreakdown.estimated_minutes || activeTaskObj.estimatedMinutes,
      });

      alert(`Successfully injected ${newItems.length} checklist items into task: "${activeTaskObj.title}"!`);
    } catch (err: any) {
      alert('Error updating task: ' + err.message);
    }
  };

  return (
    <div className="w-full overflow-hidden space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Banner / Concept Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between p-6 sm:p-8 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl gap-6 w-full overflow-hidden">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 shrink-0">
              <Brain className="w-6 h-6 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold font-mono text-neutral-100 break-words">NICK OS AI BRAIN</h1>
          </div>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-xl leading-relaxed break-words">
            Sovereign Execution Assistant. <span className="text-emerald-300 font-mono italic">"Nick décide. Le système analyse, propose, exécute et fait respecter."</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActivePanel('history')}
            className={`cursor-pointer rounded-xl ${activePanel === 'history' ? 'border-emerald-500 text-emerald-300 bg-emerald-500/10' : ''}`}
          >
            <History className="w-4 h-4 mr-1.5" />
            Proposal Logs
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handlePlanDay}
            disabled={isLoading}
            className="bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold rounded-xl"
          >
            <Sparkles className="w-4 h-4 mr-1.5" />
            Plan My Day
          </Button>
        </div>
      </div>

      {/* Main Command Center Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Hand: Controls & Input Parameters */}
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <div className="space-y-4">
              <div className="border-b border-neutral-850 pb-2 mb-4">
                <h3 className="text-xs font-mono uppercase font-bold text-neutral-300">Executive AI Actions</h3>
                <p className="text-[10px] text-neutral-500">Contextual analysis triggers</p>
              </div>
              
              {/* Task Selector for context-linked triggers */}
              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1.5 uppercase">Target Focus Task</label>
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-850 rounded-lg text-xs py-2 px-3 text-neutral-200 focus:outline-hidden focus:border-amber-500 font-mono cursor-pointer"
                >
                  <option value="" disabled>-- Select target task --</option>
                  {tasks.filter(t => t.status !== 'completed' && t.status !== 'abandoned').map(t => (
                    <option key={t.id} value={t.id}>
                      [{t.priority.toUpperCase()}] {t.title}
                    </option>
                  ))}
                </select>
                {activeTaskObj && (
                  <p className="text-[10px] text-neutral-500 mt-1 font-mono">
                    Est: {activeTaskObj.estimatedMinutes}m | Level: {activeTaskObj.commitmentLevel.replace('_', ' ')}
                  </p>
                )}
              </div>

              <div className="h-px bg-neutral-850 my-2" />

              {/* Cognitive Tasks Trigger Suite */}
              <div className="space-y-2">
                
                <button
                  onClick={handleCockpitReasoning}
                  disabled={isLoading || !selectedTaskId}
                  className="w-full text-left flex items-center justify-between p-3 rounded-lg border border-neutral-850 bg-neutral-900/40 hover:bg-neutral-800/50 transition duration-150 cursor-pointer group disabled:opacity-40"
                >
                  <div className="flex items-center gap-3">
                    <Compass className="w-4.5 h-4.5 text-amber-400 group-hover:scale-110 transition duration-150" />
                    <div>
                      <h4 className="text-xs font-bold text-neutral-200">What should I do now?</h4>
                      <p className="text-[10px] text-neutral-500">Task context explanation & micro-starts</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-amber-400" />
                </button>

                <button
                  onClick={handleBreakDown}
                  disabled={isLoading || !selectedTaskId}
                  className="w-full text-left flex items-center justify-between p-3 rounded-lg border border-neutral-850 bg-neutral-900/40 hover:bg-neutral-800/50 transition duration-150 cursor-pointer group disabled:opacity-40"
                >
                  <div className="flex items-center gap-3">
                    <Split className="w-4.5 h-4.5 text-sky-400 group-hover:scale-110 transition duration-150" />
                    <div>
                      <h4 className="text-xs font-bold text-neutral-200">Break task down</h4>
                      <p className="text-[10px] text-neutral-500">Deconstruct vague scope to micro-deliverables</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-sky-400" />
                </button>

                {/* Intelligent Blocker Form */}
                <div className="p-3 rounded-lg border border-neutral-850 bg-neutral-900/40 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <AlertOctagon className="w-4.5 h-4.5 text-rose-400" />
                    <div>
                      <h4 className="text-xs font-bold text-neutral-200">I am blocked</h4>
                      <p className="text-[10px] text-neutral-500 font-mono">Inertia unblocker protocol</p>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Describe what's blocking you..."
                    value={blockerReason}
                    onChange={(e) => setBlockerReason(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 rounded-lg text-xs py-1.5 px-2.5 text-neutral-200 focus:outline-hidden focus:border-rose-500 font-mono"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBlocked}
                    disabled={isLoading || !selectedTaskId}
                    className="w-full border-rose-500/30 text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
                  >
                    Unblock Me
                  </Button>
                </div>

                <div className="h-px bg-neutral-850 my-2" />

                <button
                  onClick={handleReplan}
                  disabled={isLoading}
                  className="w-full text-left flex items-center justify-between p-3 rounded-lg border border-neutral-850 bg-neutral-900/40 hover:bg-neutral-800/50 transition duration-150 cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <RotateCw className="w-4.5 h-4.5 text-emerald-400 group-hover:rotate-45 transition duration-150" />
                    <div>
                      <h4 className="text-xs font-bold text-neutral-200">Replan afternoon program</h4>
                      <p className="text-[10px] text-neutral-500">Dynamic re-scheduler for slips/delays</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-emerald-400" />
                </button>

              </div>
            </div>
          </Card>
        </div>

        {/* Right Hand: Structured Interactive Display Panels */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Loading Indicator */}
          {isLoading && (
            <div className="p-12 text-center border border-neutral-850 rounded-2xl bg-neutral-900/20 backdrop-blur-xs flex flex-col items-center justify-center gap-4 animate-pulse">
              <Brain className="w-10 h-10 text-amber-500 animate-spin" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold font-mono text-neutral-200">AI BRAIN COGNITIVE CYCLE ACTIVE</h3>
                <p className="text-xs text-neutral-500">Evaluating goals, scheduling conflicts, and previous execution scores...</p>
              </div>
            </div>
          )}

          {/* API Error Box */}
          {apiError && !isLoading && (
            <div className="p-4 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-xl flex items-start gap-3 text-xs">
              <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold font-mono">Cognitive Pipeline Interrupted</h4>
                <p>{apiError}</p>
                {apiError.includes('GEMINI_API_KEY_MISSING') && (
                  <p className="text-[10px] text-rose-400 underline cursor-pointer font-mono mt-1">
                    Go to left menu &gt; Settings to insert API keys.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 1. PLANNER VIEW PANEL */}
          {!isLoading && activePanel === 'planner' && (
            <div className="space-y-6">
              {currentProposal ? (
                <div className="space-y-6">
                  {/* Proposal Metadata Summary */}
                  <div className="p-5 border border-amber-500/20 bg-amber-500/5 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="amber" className="border-amber-500/30 text-amber-300 font-mono">
                          {currentProposal.type.toUpperCase().replace('_', ' ')}
                        </Badge>
                        <span className="text-[11px] font-mono text-neutral-500">Generated just now</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-mono text-neutral-400">Confidence:</span>
                        <span className={`text-xs font-bold font-mono ${
                          (currentProposal.payload.confidence || 0.8) > 0.8 ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {Math.round((currentProposal.payload.confidence || 0.8) * 100)}%
                        </span>
                      </div>
                    </div>
                    
                    <h2 className="text-lg font-bold text-neutral-100">{currentProposal.payload.title}</h2>
                    <p className="text-xs text-neutral-300 italic">" {currentProposal.explanation} "</p>
                    
                    {/* Review Controls (The Sovereignty Mandate) */}
                    <div className="flex gap-2.5 pt-2">
                      {currentProposal.status === 'pending' ? (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              if (currentProposal.type === 'replan') {
                                handleApproveReplan(currentProposal.id);
                              } else {
                                handleApprovePlan(currentProposal.id);
                              }
                            }}
                            className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold"
                          >
                            <Check className="w-4 h-4 mr-1.5" />
                            Approve & Execute
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRejectProposal(currentProposal.id)}
                            className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                          >
                            <XCircle className="w-4 h-4 mr-1.5" />
                            Reject Proposal
                          </Button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-xs font-mono">
                          {currentProposal.status === 'approved' ? (
                            <span className="text-emerald-400 flex items-center gap-1.5">
                              <CheckCircle className="w-4 h-4" /> APPROVED & APPLIED TO SCHEDULE
                            </span>
                          ) : (
                            <span className="text-neutral-500 flex items-center gap-1.5">
                              <XCircle className="w-4 h-4" /> REJECTED
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Behavioral Safeguards & Plan Quality warnings */}
                  {currentProposal.type === 'day_plan' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left column: Buffer & Assumptions */}
                      <Card className="p-4 space-y-3.5 border border-neutral-800">
                        <h4 className="text-xs font-mono uppercase text-neutral-400 font-bold tracking-wider">
                          Behavioral Calibration & Assumptions
                        </h4>
                        
                        {currentProposal.payload.buffer_time && (
                          <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/10 text-xs">
                            <span className="text-[10px] text-blue-400 font-bold uppercase font-mono block">
                              Recommended Buffer Allocation
                            </span>
                            <span className="text-neutral-200 mt-1 block">
                              {currentProposal.payload.buffer_time}
                            </span>
                          </div>
                        )}

                        {currentProposal.payload.assumptions && currentProposal.payload.assumptions.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] text-neutral-400 font-bold uppercase font-mono block">
                              Core Plan Assumptions
                            </span>
                            <ul className="list-disc pl-4 text-xs text-neutral-300 space-y-1 font-mono">
                              {currentProposal.payload.assumptions.map((ass: string, idx: number) => (
                                <li key={idx}>{ass}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </Card>

                      {/* Right column: Deterministic Quality Warnings */}
                      <Card className="p-4 space-y-3 border border-neutral-800">
                        <h4 className="text-xs font-mono uppercase text-neutral-400 font-bold tracking-wider">
                          NICK OS Plan Quality Auditor
                        </h4>
                        
                        {(() => {
                          const planWarnings = behaviorProfile
                            ? AdaptiveLearningService.checkPlanQuality(
                                {
                                  ...currentProposal.payload,
                                  timeBlocks: currentProposal.payload.time_blocks || []
                                },
                                tasks,
                                behaviorProfile
                              )
                            : [];

                          return planWarnings.length === 0 ? (
                            <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-xs flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-emerald-400" />
                              <span className="text-emerald-300 font-mono">
                                No scheduling conflicts, overload, or buffer deficits detected.
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {planWarnings.map((warn, wIdx) => {
                                const borderStyle = 
                                  warn.type === 'conflict' 
                                    ? 'border-rose-500/30 bg-rose-500/5 text-rose-300' 
                                    : 'border-amber-500/30 bg-amber-500/5 text-amber-300';
                                return (
                                  <div key={wIdx} className={`p-2.5 rounded-lg border text-xs font-mono flex items-start gap-2 ${borderStyle}`}>
                                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <div>
                                      <span className="font-bold block text-[10px] uppercase">
                                        {warn.type} Warning
                                      </span>
                                      <span className="text-neutral-200 leading-snug">{warn.message}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </Card>
                    </div>
                  )}

                  {/* Proposed Schedule Timeblocks */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-mono uppercase text-neutral-400 tracking-wider">Suggested Day Program</h3>
                    <div className="space-y-2.5">
                      {(currentProposal.payload.time_blocks || currentProposal.payload.suggested_time_blocks || []).map((block: any, idx: number) => {
                        const hasTask = block.taskId;
                        const linkedTask = tasks.find(t => t.id === block.taskId);
                        
                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition duration-150 ${
                              block.blockType === 'deep_work'
                                ? 'bg-amber-500/10 border-amber-500/30'
                                : block.blockType === 'break' || block.blockType === 'rest'
                                ? 'bg-neutral-900 border-neutral-850 opacity-80'
                                : 'bg-neutral-900/60 border-neutral-850'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {/* Time Block */}
                              <div className="font-mono text-xs font-bold text-neutral-300 py-1 px-2.5 bg-neutral-950/60 rounded border border-neutral-800 shrink-0">
                                {block.startTime} - {block.endTime}
                              </div>
                              
                              <div>
                                <h4 className="text-xs font-bold text-neutral-100">{block.title}</h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-neutral-950 border border-neutral-850 text-neutral-400">
                                    {block.blockType.replace('_', ' ')}
                                  </span>
                                  {linkedTask && (
                                    <span className="text-[10px] text-amber-300 font-mono">
                                      Task: {linkedTask.title}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 border border-neutral-850 bg-neutral-900/10 rounded-2xl text-center space-y-4">
                  <Calendar className="w-10 h-10 mx-auto text-neutral-600" />
                  <div className="space-y-1">
                    <h3 className="text-xs font-mono uppercase text-neutral-400">No Active Proposal</h3>
                    <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                      Click <span className="text-amber-400 font-bold">"Plan My Day"</span> or trigger <span className="text-emerald-400 font-bold">"Replan afternoon program"</span> in the executive actions to generate a structured proposal.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. COCKPIT CO-PILOT ANALYSIS (WHAT TO DO NOW) */}
          {!isLoading && activePanel === 'cockpit' && cockpitReasoning && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-4 border border-neutral-850 bg-neutral-900/40 rounded-xl space-y-2">
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest">Active Focus Context</span>
                <h2 className="text-base font-bold text-neutral-100">Analyzing: "{activeTaskObj?.title}"</h2>
              </div>

              {/* Rationale Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <div className="border-b border-neutral-850 pb-2 mb-3">
                    <h3 className="text-xs font-mono uppercase font-bold text-neutral-300">Strategic Connection</h3>
                    <p className="text-[10px] text-neutral-500">Why this session is non-negotiable</p>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">{cockpitReasoning.why_it_matters}</p>
                </Card>
                <Card>
                  <div className="border-b border-neutral-850 pb-2 mb-3">
                    <h3 className="text-xs font-mono uppercase font-bold text-neutral-300">High Impact Focus Strategy</h3>
                    <p className="text-[10px] text-neutral-500">How to secure absolute flow state</p>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">{cockpitReasoning.focus_strategy}</p>
                </Card>
              </div>

              {/* Instant Micro-Action Panel */}
              <div className="p-5 border border-amber-500/25 bg-amber-500/5 rounded-2xl space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <h3 className="text-xs font-mono uppercase font-bold text-amber-300">Absolute First Inertia-Breaker Action</h3>
                </div>
                
                <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-xl">
                  <p className="text-sm text-neutral-100 font-mono font-bold">{cockpitReasoning.first_action}</p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-[11px] font-mono uppercase text-neutral-400 font-semibold">Granular Execution Flow</h4>
                  <div className="space-y-1.5">
                    {cockpitReasoning.sub_steps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-neutral-300">
                        <span className="font-mono text-amber-500 text-[10px] mt-0.5">{idx + 1}.</span>
                        <p>{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. MICRO-STEP TASK CHECKLIST BREAKDOWN */}
          {!isLoading && activePanel === 'breakdown' && taskBreakdown && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-5 border border-sky-500/20 bg-sky-500/5 rounded-2xl flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-sky-400 uppercase tracking-widest">Sub-Step Breakdown</span>
                  <h2 className="text-base font-bold text-neutral-100">Deconstructed: "{activeTaskObj?.title}"</h2>
                  <p className="text-xs text-neutral-300">{taskBreakdown.explanation}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono text-neutral-500 block uppercase">Recommended Total</span>
                  <span className="text-lg font-bold font-mono text-sky-400">{taskBreakdown.estimated_minutes} min</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono uppercase text-neutral-400 font-bold">Suggested Micro-Deliverable Checklist</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleApplyChecklistToTask}
                    className="border-sky-500/30 text-sky-300 hover:bg-sky-500/10 hover:text-sky-200"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Inject checklist into task
                  </Button>
                </div>

                <div className="p-4 border border-neutral-850 bg-neutral-900/20 rounded-xl space-y-3">
                  {taskBreakdown.suggested_checklist.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-2.5 bg-neutral-950 border border-neutral-900 rounded-lg">
                      <div className="w-5 h-5 rounded border border-neutral-700 bg-neutral-900 flex items-center justify-center font-mono text-[9px] text-sky-400 select-none mt-0.5">
                        {idx + 1}
                      </div>
                      <p className="text-xs font-mono text-neutral-200 mt-0.5">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4. INTELLIGENT UNBLOCKER ANALYSIS */}
          {!isLoading && activePanel === 'unblocker' && blockerResolution && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-4 border border-rose-500/20 bg-rose-500/5 rounded-2xl space-y-1">
                <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest font-bold">Unblocking Protocol</span>
                <h2 className="text-base font-bold text-neutral-100">Blocked on: "{activeTaskObj?.title}"</h2>
              </div>

              <Card>
                <div className="border-b border-neutral-850 pb-2 mb-3">
                  <h3 className="text-xs font-mono uppercase font-bold text-rose-300">Immediate Cognitive Diagnosis</h3>
                  <p className="text-[10px] text-neutral-500">Why progress has halted</p>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">{blockerResolution.assessment}</p>
              </Card>

              {/* Instant Action */}
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2">
                <h3 className="text-[11px] font-mono uppercase text-rose-300 font-bold flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5" /> Physical Action to Break Blockage immediately
                </h3>
                <p className="text-xs text-neutral-100 font-bold bg-neutral-950 p-3 rounded-lg border border-neutral-850 font-mono">
                  {blockerResolution.first_action}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <div className="border-b border-neutral-850 pb-2 mb-3">
                    <h3 className="text-xs font-mono uppercase font-bold text-neutral-300">Required Decisions</h3>
                    <p className="text-[10px] text-neutral-500">Resolve these to clear ambiguity</p>
                  </div>
                  <div className="space-y-2">
                    {blockerResolution.decisions_needed.map((dec, idx) => (
                      <div key={idx} className="flex gap-2 text-xs text-neutral-300">
                        <span className="text-rose-400 font-mono">?</span>
                        <p>{dec}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card>
                  <div className="border-b border-neutral-850 pb-2 mb-3">
                    <h3 className="text-xs font-mono uppercase font-bold text-neutral-300">Alternative Paths</h3>
                    <p className="text-[10px] text-neutral-500">How to bypass this bottleneck completely</p>
                  </div>
                  <div className="space-y-2">
                    {blockerResolution.alternate_paths.map((path, idx) => (
                      <div key={idx} className="flex gap-2 text-xs text-neutral-300">
                        <span className="text-neutral-500 font-mono">➔</span>
                        <p>{path}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* 5. HISTORY / AUDIT LOG */}
          {!isLoading && activePanel === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono uppercase text-neutral-400 font-bold">Proposal Audit Logs</h3>
                <span className="text-[10px] text-neutral-500 font-mono">Trace of AI-suggested program modifications</span>
              </div>

              {aiProposals.length === 0 ? (
                <div className="p-12 text-center border border-neutral-800 rounded-xl bg-neutral-900/10">
                  <p className="text-xs text-neutral-500 font-mono">No previous proposals found.</p>
                </div>
              ) : (
                <div className="border border-neutral-850 rounded-xl overflow-hidden bg-neutral-900/40 divide-y divide-neutral-850 w-full">
                  {aiProposals.slice().reverse().map((prop) => (
                    <div key={prop.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs w-full overflow-hidden">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-neutral-200 capitalize font-mono text-[11px] break-words">
                            {prop.type.replace('_', ' ')}
                          </span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border shrink-0 ${
                            prop.status === 'approved'
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900'
                              : prop.status === 'rejected'
                              ? 'bg-rose-950/40 text-rose-400 border-rose-900'
                              : 'bg-amber-950/40 text-amber-400 border-amber-900'
                          }`}>
                            {prop.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 italic break-words">" {prop.explanation} "</p>
                        <p className="text-[9px] text-neutral-500 font-mono break-all">
                          Generated on: {new Date(prop.createdAt).toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCurrentProposal(prop);
                            if (prop.type === 'replan') {
                              setReplanOutput(prop.payload);
                            }
                            setActivePanel('planner');
                          }}
                          className="border-neutral-700 text-neutral-300"
                        >
                          View Output
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
