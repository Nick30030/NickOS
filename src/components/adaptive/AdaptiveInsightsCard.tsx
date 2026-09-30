// ==============================================================================
// NICK OS — ADAPTIVE INSIGHTS & BEHAVIORAL CONTROL DASHBOARD
// ==============================================================================

import React, { useState } from 'react';
import { useExecution } from '../../context/ExecutionContext';
import { BehaviorEngine } from '../../services/adaptive/BehaviorEngine';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { 
  Brain, 
  ShieldCheck, 
  ShieldAlert, 
  RotateCcw, 
  Trash2, 
  HelpCircle, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Sliders,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';

export const AdaptiveInsightsCard: React.FC = () => {
  const { behaviorMetrics, tasks, transparencyInsights, refreshData } = useExecution();
  const memoryProfile = behaviorMetrics ? BehaviorEngine.buildBehavioralProfile(behaviorMetrics, tasks) : null;
  
  const [learningDisabled, setLearningDisabled] = useState<boolean>(BehaviorEngine.isLearningDisabled());
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);
  const [showMemoryInspector, setShowMemoryInspector] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleToggleLearning = () => {
    const nextState = !learningDisabled;
    BehaviorEngine.setLearningDisabled(nextState);
    setLearningDisabled(nextState);
    setSuccessMsg(nextState ? 'Behavioral learning disabled.' : 'Behavioral learning enabled.');
    setTimeout(() => setSuccessMsg(null), 3000);
    refreshData();
  };

  const handleDeleteInsight = (id: string) => {
    BehaviorEngine.deleteInsight(id);
    setSuccessMsg('Insight dismissed successfully.');
    setTimeout(() => setSuccessMsg(null), 3000);
    refreshData();
  };

  const handleResetPatterns = () => {
    BehaviorEngine.resetBehavioralMemory();
    setLearningDisabled(false);
    setSuccessMsg('Behavioral memory patterns reset to default.');
    setTimeout(() => setSuccessMsg(null), 3000);
    refreshData();
  };

  return (
    <Card className="p-6 space-y-6 border border-neutral-800" id="adaptive-insights-card">
      <div className="flex items-center justify-between pb-4 border-b border-neutral-850">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-neutral-100">
              Adaptive Behavioral Learning Engine
            </h3>
            <p className="text-xs text-neutral-400 font-mono">
              Factual execution telemetry, recency-weighted patterns, and verifiable planning recommendations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 text-[10px] font-mono rounded-full border ${learningDisabled ? 'bg-neutral-900 border-neutral-700 text-neutral-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
            {learningDisabled ? 'LEARNING PAUSED' : 'ACTIVE LEARNING'}
          </span>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs font-mono text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Top Behavioral Metrics Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-850">
          <span className="text-neutral-500 text-[10px] uppercase block">Estimation Bias</span>
          <span className="text-lg font-bold text-amber-400">
            {behaviorMetrics ? `${Math.round(behaviorMetrics.estimationErrorRate * 100)}%` : '100%'}
          </span>
          <span className="text-[10px] text-neutral-500 block mt-0.5">Actual vs Planned</span>
        </div>

        <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-850">
          <span className="text-neutral-500 text-[10px] uppercase block">Completion Rate</span>
          <span className="text-lg font-bold text-emerald-400">
            {behaviorMetrics ? `${Math.round(behaviorMetrics.completionRate * 100)}%` : '0%'}
          </span>
          <span className="text-[10px] text-neutral-500 block mt-0.5">Across {behaviorMetrics?.totalSessionsAnalyzed || 0} sessions</span>
        </div>

        <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-850">
          <span className="text-neutral-500 text-[10px] uppercase block">Context Switches</span>
          <span className="text-lg font-bold text-blue-400">
            {behaviorMetrics ? behaviorMetrics.contextSwitchRate.toFixed(1) : '0.0'}/day
          </span>
          <span className="text-[10px] text-neutral-500 block mt-0.5">Project transitions</span>
        </div>

        <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-850">
          <span className="text-neutral-500 text-[10px] uppercase block">Interruption Frequency</span>
          <span className="text-lg font-bold text-rose-400">
            {behaviorMetrics ? `${Math.round(behaviorMetrics.interruptionFrequency * 100)}%` : '0%'}
          </span>
          <span className="text-[10px] text-neutral-500 block mt-0.5">Session interruption rate</span>
        </div>
      </div>

      {/* Transparency Insights & Traceability */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase font-bold text-neutral-400 tracking-wider">
            Traceable Behavioral Insights ({transparencyInsights.length})
          </span>
          <button
            onClick={() => setShowMemoryInspector(!showMemoryInspector)}
            className="text-[11px] font-mono text-amber-400 hover:text-amber-300 underline"
          >
            {showMemoryInspector ? 'Hide Memory Inspector' : 'Inspect Stored Memory'}
          </button>
        </div>

        {transparencyInsights.length === 0 ? (
          <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-850 text-xs font-mono text-neutral-500 text-center">
            No behavioral insights recorded yet. Complete more focus sessions to establish patterns.
          </div>
        ) : (
          <div className="space-y-3">
            {transparencyInsights.map(insight => {
              const isExpanded = expandedTraceId === insight.id;
              return (
                <div key={insight.id} className="p-4 bg-neutral-950 rounded-xl border border-neutral-850 space-y-3 font-mono text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-100 text-sm">{insight.title}</span>
                        <span className={`px-2 py-0.5 text-[9px] uppercase rounded border ${insight.confidenceLevel === 'high' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
                          {insight.confidenceLevel} confidence ({Math.round(insight.confidence * 100)}%)
                        </span>
                      </div>
                      <p className="text-neutral-300 mt-1">{insight.observation}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setExpandedTraceId(isExpanded ? null : insight.id)}
                        className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded text-[11px] flex items-center gap-1"
                        title="Why am I seeing this recommendation?"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                        {isExpanded ? 'Hide Trace' : 'Why?'}
                      </button>
                      <button
                        onClick={() => handleDeleteInsight(insight.id)}
                        className="p-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-500 hover:text-red-400 rounded"
                        title="Dismiss insight"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-neutral-900/60 rounded-lg border border-neutral-800 text-neutral-300 space-y-1">
                    <div className="text-neutral-400 text-[10px] uppercase font-bold">Recommendation:</div>
                    <div>{insight.recommendation}</div>
                  </div>

                  {/* Traceability Panel */}
                  {isExpanded && insight.traceability && (
                    <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-700 space-y-2 text-[11px] animate-in fade-in duration-150">
                      <div className="text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5" /> Explainability & Traceability Audit
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-neutral-300 pt-1">
                        <div><strong className="text-neutral-400">Observation:</strong> {insight.traceability.observation}</div>
                        <div><strong className="text-neutral-400">Data Source:</strong> {insight.traceability.data}</div>
                        <div><strong className="text-neutral-400">Time Period:</strong> {insight.traceability.period}</div>
                        <div><strong className="text-neutral-400">Heuristic Reason:</strong> {insight.traceability.reason}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Memory Inspector Drawer */}
      {showMemoryInspector && memoryProfile && (
        <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-3 font-mono text-xs animate-in fade-in duration-150">
          <h4 className="text-neutral-200 font-bold uppercase tracking-wider text-xs flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" /> Behavioral Memory Profile Inspector
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-neutral-300">
            <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
              <span className="text-neutral-500 text-[10px] block">Planning Capacity Ratio</span>
              <span className="font-bold text-white">{Math.round(memoryProfile.planning_capacity.value.ratio * 100)}%</span>
              <span className="text-[10px] text-neutral-500 block">Confidence: {memoryProfile.planning_capacity.confidence}</span>
            </div>
            <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
              <span className="text-neutral-500 text-[10px] block">Estimation Bias Multiplier</span>
              <span className="font-bold text-white">{memoryProfile.estimation_bias.value.biasMultiplier.toFixed(2)}x</span>
              <span className="text-[10px] text-neutral-500 block">Sample size: {memoryProfile.estimation_bias.sampleSize}</span>
            </div>
            <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
              <span className="text-neutral-500 text-[10px] block">Preferred Execution Window</span>
              <span className="font-bold text-white">{memoryProfile.preferred_execution_windows.value.bestWindow}</span>
              <span className="text-[10px] text-neutral-500 block">Last updated: {new Date(memoryProfile.preferred_execution_windows.lastUpdated).toLocaleTimeString()}</span>
            </div>
            <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
              <span className="text-neutral-500 text-[10px] block">Context Switch Rate</span>
              <span className="font-bold text-white">{memoryProfile.context_switch_rate.value.toFixed(1)} / day</span>
              <span className="text-[10px] text-neutral-500 block">Confidence: {memoryProfile.context_switch_rate.confidence}</span>
            </div>
          </div>
        </div>
      )}

      {/* User Controls Footer */}
      <div className="flex flex-wrap items-center justify-between pt-4 border-t border-neutral-850 gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleLearning}
            className="border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-200"
          >
            {learningDisabled ? 'Resume Behavioral Learning' : 'Pause Behavioral Learning'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleResetPatterns}
            className="border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-rose-400 hover:text-rose-300"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset Learned Patterns
          </Button>
        </div>

        <span className="text-[10px] text-neutral-500 font-mono">
          Resetting patterns clears derived insights without altering underlying task execution history.
        </span>
      </div>
    </Card>
  );
};
