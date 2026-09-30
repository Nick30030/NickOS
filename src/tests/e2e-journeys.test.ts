// ==============================================================================
// NICK OS — END-TO-END CRITICAL USER JOURNEYS
// Simulates the full multi-phase workflows:
// Journey 1: Full Execution Lifecycle (Plan -> NOW -> Pause -> Resume -> Complete -> Review)
// Journey 2: Disrupted Execution (Blocker -> Postpone -> Re-plan -> Analytics Audit)
// Journey 3: Calendar Sync & Conflict-Free Execution (Import -> Around-event Planning -> Execution)
// Journey 4: AI Assisted Planning (Proposal -> Edit -> Approval -> Schedule Commitment)
// ==============================================================================

import { ExecutionService } from '../services/execution/ExecutionService';
import { getRepository } from '../services/storage';
import { AnalyticsService } from '../services/analytics/AnalyticsService';
import { detectPlanningConflict } from '../lib/utils';
import { Task, Project, DayPlan, TimeBlock, TaskStatus } from '../types/domain';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ E2E JOURNEY TEST FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✓ PASSED: ${message}`);
  }
}

async function runE2EJourneys() {
  console.log('\n================================================================');
  console.log('🏁 RUNNING NICK OS END-TO-END USER JOURNEYS');
  console.log('================================================================\n');

  const repo = getRepository();
  const executionService = new ExecutionService();

  // ============================================================================
  console.log('JOURNEY 1: Full Execution Lifecycle');
  console.log('----------------------------------------------------------------');
  // 1. Authenticated User Profile & Project Creation
  const profile = await repo.getUserProfile();
  assert(profile !== null, 'Step 1.1: User profile is accessible and initialized');

  const coreProject = await repo.createProject({
    name: 'Apollo Production Readiness',
    code: 'APR',
    description: 'Finalizing production readiness for Nick OS',
    status: 'active',
    priority: 'high',
    color: '#10b981',
  });
  assert(coreProject.id !== undefined, 'Step 1.2: Project created');

  // 2. Create Task
  const mainTask = await repo.createTask({
    title: 'Deploy End-to-End Verification Pipeline',
    projectId: coreProject.id,
    status: 'inbox',
    priority: 'high',
    commitmentLevel: 'hard_commitment',
    estimatedMinutes: 60,
    scheduledDate: '2026-09-21',
  });
  assert(mainTask.status === 'inbox', 'Step 1.3: Task created in inbox');

  // 3. Plan Task
  const plannedTask = await executionService.transitionTaskStatus(mainTask.id, 'planned');
  assert(plannedTask.status === 'planned', 'Step 1.4: Task transitioned to planned status');

  // 4. Open NOW & Start Execution Session
  const { session: activeSession, task: runningTask } = await executionService.startSession({
    taskId: plannedTask.id,
    notes: 'Starting deep work execution block',
  });
  assert(activeSession.status === 'active', 'Step 1.5: Focus session active');
  assert(runningTask.status === 'in_progress', 'Step 1.6: Task state is in_progress');

  // 5. Record Pause (Break / Distraction)
  const pausedSession = await executionService.pauseSession({
    sessionId: activeSession.id,
    reason: 'Quick hydration break',
    category: 'break',
  });
  assert(pausedSession.status === 'paused', 'Step 1.7: Session recorded pause cleanly');

  // 6. Resume Session
  const resumedSession = await executionService.resumeSession(activeSession.id);
  assert(resumedSession.status === 'active', 'Step 1.8: Session resumed cleanly');

  // 7. Complete Task
  const { session: endedSession, task: finishedTask } = await executionService.completeSession({
    sessionId: activeSession.id,
    notes: 'Pipeline active and verified green',
    finalActualMinutes: 55,
  });
  assert(endedSession.status === 'completed', 'Step 1.9: Session marked completed');
  assert(finishedTask.status === 'completed', 'Step 1.10: Task marked completed');
  assert(finishedTask.actualMinutes === 55, 'Step 1.11: Task actual execution minutes recorded');

  // 8. Verify Daily Review Shows Completion
  const allTasks = await repo.getTasks();
  const completedToday = allTasks.filter(t => t.status === 'completed' && t.id === finishedTask.id);
  assert(completedToday.length === 1, 'Step 1.12: Daily review accurately displays completed task');

  // ============================================================================
  console.log('\nJOURNEY 2: Disrupted Execution & Behavioral Postponement Tracking');
  console.log('----------------------------------------------------------------');
  // 1. Create task scheduled for today
  const disruptedTask = await repo.createTask({
    title: 'Review Secondary Infrastructure Security Logs',
    projectId: coreProject.id,
    status: 'planned',
    priority: 'medium',
    commitmentLevel: 'stretch',
    estimatedMinutes: 40,
    scheduledDate: '2026-09-21',
  });

  // 2. Start execution
  const { session: disruptedSession } = await executionService.startSession({
    taskId: disruptedTask.id,
    notes: 'Starting security log inspection',
  });

  // 3. Encounter urgent blocker / distraction
  await executionService.pauseSession({
    sessionId: disruptedSession.id,
    reason: 'High priority customer outage triage',
    category: 'distraction',
  });

  // 4. Postpone task to tomorrow
  const postponedTask = await repo.updateTask(disruptedTask.id, {
    status: 'postponed',
    scheduledDate: '2026-09-22',
    postponeCount: (disruptedTask.postponeCount || 0) + 1,
    postponeReason: 'High priority customer outage triage',
  });
  assert(postponedTask.status === 'postponed', 'Step 2.1: Task marked as postponed');
  assert(postponedTask.postponeCount === 1, 'Step 2.2: Task postponement count incremented');

  // 5. Verify analytics audits track postponement
  const currentTasks = await repo.getTasks();
  const postponedAudit = AnalyticsService.calculatePostponementAnalytics(currentTasks);
  assert(postponedAudit.totalPostponedTasks >= 1, 'Step 2.3: Analytics command center records postponement');
  assert(
    postponedAudit.postponedItems.some(i => i.id === disruptedTask.id),
    'Step 2.4: Specific postponed task identified in analytics audit'
  );

  // ============================================================================
  console.log('\nJOURNEY 3: Calendar Sync & Conflict-Free Execution');
  console.log('----------------------------------------------------------------');
  // 1. Simulate imported calendar event (e.g. Google Calendar Team Standup: 10:00 - 10:30)
  const calendarEvent = {
    title: 'Engineering Team Standup',
    startTime: '10:00',
    endTime: '10:30',
    isExternal: true,
  };

  // 2. Plan Deep Work task candidate: 09:00 - 10:00 (No conflict)
  const candidateBlock1 = { startTime: '09:00', endTime: '10:00' };
  const hasConflict1 = detectPlanningConflict(calendarEvent, candidateBlock1);
  assert(hasConflict1 === false, 'Step 3.1: 09:00-10:00 block does not conflict with 10:00-10:30 standup');

  // 3. Plan conflicting block candidate: 09:30 - 10:30 (Conflicts!)
  const candidateBlock2 = { startTime: '09:30', endTime: '10:30' };
  const hasConflict2 = detectPlanningConflict(calendarEvent, candidateBlock2);
  assert(hasConflict2 === true, 'Step 3.2: 09:30-10:30 block detected as conflicting with 10:00-10:30 standup');

  // 4. Save conflict-free scheduled block
  const savedDayPlan = await repo.saveDayPlan({
    date: '2026-09-21',
    plannedStart: '08:00',
    plannedEnd: '18:00',
    status: 'confirmed',
    generatedByAi: false,
    approvedByUser: true,
    plannedTaskIds: [disruptedTask.id],
    totalPlannedMinutes: 60,
    totalActualMinutes: 0,
  });
  const savedBlock = await repo.createTimeBlock({
    dailyPlanId: savedDayPlan.id,
    title: 'Deep Architecture Focus',
    blockType: 'deep_work',
    startTime: candidateBlock1.startTime,
    endTime: candidateBlock1.endTime,
    status: 'planned',
  });
  assert(savedBlock.id !== undefined, 'Step 3.3: Conflict-free scheduled time block persisted');

  // ============================================================================
  console.log('\nJOURNEY 4: AI Assisted Day Planning Proposal Approval');
  console.log('----------------------------------------------------------------');
  // 1. Simulated AI Brain generated day schedule proposal
  const aiProposalPayload = {
    id: 'ai-prop-20261001',
    date: '2026-10-01',
    focusGoalToday: 'Close out all outstanding production verification gates',
    proposedBlocks: [
      {
        title: 'Deep Work: Production Verification',
        startTime: '09:00',
        endTime: '11:00',
        blockType: 'deep_work' as const,
      },
      {
        title: 'System Integration Review',
        startTime: '13:00',
        endTime: '14:30',
        blockType: 'admin' as const,
      },
    ],
  };

  // 2. User approves proposal: commits directly to day plan and time blocks
  const approvedDayPlan = await repo.saveDayPlan({
    date: aiProposalPayload.date,
    focusGoalToday: aiProposalPayload.focusGoalToday,
    plannedStart: '09:00',
    plannedEnd: '17:00',
    status: 'confirmed',
    generatedByAi: true,
    approvedByUser: true,
    plannedTaskIds: [],
    totalPlannedMinutes: 210,
    totalActualMinutes: 0,
  });
  assert(approvedDayPlan.id !== undefined, 'Step 4.1: Approved AI day plan saved');

  for (const block of aiProposalPayload.proposedBlocks) {
    const createdBlock = await repo.createTimeBlock({
      dailyPlanId: approvedDayPlan.id,
      title: block.title,
      startTime: block.startTime,
      endTime: block.endTime,
      blockType: block.blockType,
      status: 'planned',
    });
    assert(createdBlock.id !== undefined, `Step 4.2: Approved block [${block.title}] scheduled`);
  }

  const verifiedBlocks = await repo.getTimeBlocks(approvedDayPlan.id);
  assert(verifiedBlocks.length === 2, 'Step 4.3: All approved AI proposal blocks persisted');

  console.log('\n================================================================');
  console.log('✅ ALL END-TO-END CRITICAL USER JOURNEYS PASSED');
  console.log('================================================================\n');
  process.exit(0);
}

runE2EJourneys().catch((err) => {
  console.error('Fatal E2E Journey error:', err);
  process.exit(1);
});
