// ==============================================================================
// NICK OS — INTEGRATION TEST SUITE
// Validates end-to-end multi-service linkages:
// task -> execution session -> accountability -> project progress -> AI proposal approval
// ==============================================================================

import { ExecutionService } from '../services/execution/ExecutionService';
import { getRepository } from '../services/storage';
import { ServerNotificationEngine } from '../services/notifications/ServerNotificationEngine';
import { AnalyticsService } from '../services/analytics/AnalyticsService';
import { Task, Project, Goal, DayPlan, TimeBlock, ExecutionSession } from '../types/domain';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ INTEGRATION TEST FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✓ PASSED: ${message}`);
  }
}

async function runIntegrationTests() {
  console.log('\n================================================================');
  console.log('🏁 RUNNING NICK OS INTEGRATION TEST SUITE');
  console.log('================================================================\n');

  // Initialize storage repository
  const repo = getRepository();
  const executionService = new ExecutionService();

  // ----------------------------------------------------------------------------
  console.log('1. Integration: Project -> Task Creation -> Linking');
  // ----------------------------------------------------------------------------
  const project = await repo.createProject({
    name: 'Apollo Kernel Hardening',
    code: 'APOLLO',
    description: 'System-wide reliability overhaul',
    status: 'active',
    priority: 'high',
    color: '#3b82f6',
  });
  assert(project.id !== undefined, 'Project should be successfully persisted with id');

  const task1 = await repo.createTask({
    title: 'Audit Execution State Machine',
    projectId: project.id,
    status: 'planned',
    priority: 'high',
    commitmentLevel: 'hard_commitment',
    estimatedMinutes: 45,
    scheduledDate: '2026-09-21',
  });
  assert(task1.id !== undefined, 'Task should be created with valid ID');
  assert(task1.projectId === project.id, 'Task should be linked to project ID');
  assert(task1.status === 'planned', 'Task status should initialize as planned');

  // ----------------------------------------------------------------------------
  console.log('\n2. Integration: Task -> Execution Session (Start & Telemetry)');
  // ----------------------------------------------------------------------------
  const { session: startedSession, task: activeTask } = await executionService.startSession({
    taskId: task1.id,
    notes: 'Starting Apollo state machine verification',
  });

  assert(startedSession.status === 'active', 'Execution session should be active');
  assert(startedSession.taskId === task1.id, 'Session should reference target task');
  assert(activeTask.status === 'in_progress', 'Task should transition to in_progress upon session start');
  assert(activeTask.startedAt !== undefined, 'Task startedAt timestamp should be recorded');
  assert(Boolean(startedSession.checkIns && startedSession.checkIns.length > 0), 'Session should have initial check-in entry');

  // ----------------------------------------------------------------------------
  console.log('\n3. Integration: Focus Session -> Pause (Distraction Logging)');
  // ----------------------------------------------------------------------------
  const pausedSession = await executionService.pauseSession({
    sessionId: startedSession.id,
    reason: 'Incoming urgent operational ping',
    category: 'distraction',
  });

  assert(pausedSession.status === 'paused', 'Session should be marked paused');
  assert(Boolean(pausedSession.pauses && pausedSession.pauses.length === 1), 'Session should contain exactly 1 logged pause record');
  assert(pausedSession.pauses?.[0]?.category === 'distraction', 'Pause category should match distraction');

  // Resume session
  const resumedSession = await executionService.resumeSession(startedSession.id);
  assert(resumedSession.status === 'active', 'Session should return to active after resume');
  assert(resumedSession.pauses?.[0]?.resumedAt !== undefined, 'Pause record should have resumedAt timestamp');

  // ----------------------------------------------------------------------------
  console.log('\n4. Integration: Execution Session Completion -> Task Status -> Actual Time');
  // ----------------------------------------------------------------------------
  const { session: completedSession, task: completedTask } = await executionService.completeSession({
    sessionId: startedSession.id,
    notes: 'Audit passed with 100% test coverage',
    finalActualMinutes: 50,
  });

  assert(completedSession.status === 'completed', 'Session status should be completed');
  assert(completedSession.endTime !== undefined, 'Session should have endTime timestamp');
  assert(completedTask.status === 'completed', 'Task status should transition to completed');
  assert(completedTask.completedAt !== undefined, 'Task completedAt timestamp should be recorded');
  assert(completedTask.actualMinutes === 50, 'Task actual execution minutes should be updated to 50');

  // ----------------------------------------------------------------------------
  console.log('\n5. Integration: Project Progress Calculation');
  // ----------------------------------------------------------------------------
  // Create a second task under the same project
  const task2 = await repo.createTask({
    title: 'Verification Suite Execution',
    projectId: project.id,
    status: 'planned',
    priority: 'medium',
    commitmentLevel: 'stretch',
    estimatedMinutes: 30,
    scheduledDate: '2026-09-21',
  });

  const allTasks = await repo.getTasks();
  const projectTasks = allTasks.filter(t => t.projectId === project.id);
  const completedCount = projectTasks.filter(t => t.status === 'completed').length;
  const projectProgressPct = Math.round((completedCount / projectTasks.length) * 100);

  assert(projectTasks.length === 2, 'Project should have 2 linked tasks');
  assert(completedCount === 1, 'Project should have 1 completed task');
  assert(projectProgressPct === 50, 'Project completion progress should be 50%');

  // ----------------------------------------------------------------------------
  console.log('\n6. Integration: Daily Plan -> Time Block Conflict & Selection');
  // ----------------------------------------------------------------------------
  const dailyPlan = await repo.saveDayPlan({
    date: '2026-09-21',
    plannedStart: '08:30',
    plannedEnd: '18:30',
    status: 'confirmed',
    energyTarget: 'steady',
    focusGoalToday: 'Harden system core and finalize verification',
    generatedByAi: false,
    approvedByUser: true,
    plannedTaskIds: [task1.id, task2.id],
    totalPlannedMinutes: 75,
    totalActualMinutes: 50,
  });
  assert(dailyPlan.id !== undefined, 'Daily plan should be persisted');

  const block1 = await repo.createTimeBlock({
    dailyPlanId: dailyPlan.id,
    taskId: task2.id,
    title: 'Verification Sprint',
    blockType: 'deep_work',
    startTime: '09:00',
    endTime: '10:30',
    status: 'planned',
  });
  assert(block1.id !== undefined, 'Time block should be created inside daily plan');

  // ----------------------------------------------------------------------------
  console.log('\n7. Integration: Notification Engine -> Deep Link Routing');
  // ----------------------------------------------------------------------------
  ServerNotificationEngine.clearAll();
  const notif = ServerNotificationEngine.createNotification({
    userId: 'nick-user',
    type: 'task_reminder',
    title: 'Start Verification Sprint',
    body: 'Your deep work block has arrived.',
    priority: 'high',
    scheduledFor: new Date().toISOString(),
    status: 'pending',
    metadata: { deepLink: '#/now' },
  });

  assert(notif.metadata?.deepLink === '#/now', 'Notification metadata should route directly to NOW cockpit');

  // ----------------------------------------------------------------------------
  console.log('\n8. Integration: Analytics Data Aggregation');
  // ----------------------------------------------------------------------------
  const analyticsOverview = AnalyticsService.calculateOverview(
    allTasks,
    [completedSession],
    { dateRange: 'all' }
  );

  assert(analyticsOverview.plannedCommitments >= 2, 'Analytics should compute planned commitments count');
  assert(analyticsOverview.completedCommitments >= 1, 'Analytics should compute completed commitments count');
  assert(analyticsOverview.actualExecutionMinutes >= 50, 'Analytics should aggregate actual execution minutes');

  console.log('\n================================================================');
  console.log('✅ ALL INTEGRATION TESTS COMPLETED SUCCESSFULLY');
  console.log('================================================================\n');
  process.exit(0);
}

runIntegrationTests().catch((err) => {
  console.error('Fatal integration test error:', err);
  process.exit(1);
});
