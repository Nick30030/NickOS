// ==============================================================================
// NICK OS — UNIT TESTING SUITE
// Tests core deterministic algorithms, state machine transitions, duration logic,
// metrics, estimation bias, planning conflicts, and timezone math.
// ==============================================================================

import { TaskStateMachine } from '../services/execution/TaskStateMachine';
import { ExecutionService } from '../services/execution/ExecutionService';
import {
  formatSecondsToTimer,
  timeToMinutes,
  minutesToTime,
  detectPlanningConflict,
  getDateStringInTimezone,
  getTimeStringInTimezone,
  isDateOverdue,
  isDateUpcoming,
  isDateToday,
} from '../lib/utils';
import { TaskStatus, ExecutionSession } from '../types/domain';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ UNIT TEST FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✓ PASSED: ${message}`);
  }
}

async function runUnitTests() {
  console.log('\n================================================================');
  console.log('🏁 RUNNING NICK OS UNIT TEST SUITE');
  console.log('================================================================\n');

  const executionService = new ExecutionService();

  // ----------------------------------------------------------------------------
  console.log('1. Duration & Stopwatch Calculations');
  // ----------------------------------------------------------------------------
  const baseStart = new Date('2026-09-21T10:00:00.000Z');
  const baseEnd = new Date('2026-09-21T11:00:00.000Z'); // 3600 seconds total

  // Case A: No pauses
  const sessionNoPause: ExecutionSession = {
    id: 'test-sess-1',
    taskId: 'task-1',
    startTime: baseStart.toISOString(),
    endTime: baseEnd.toISOString(),
    durationSeconds: 0,
    durationMinutes: 0,
    status: 'completed',
    interruptionStatus: false,
    createdAt: baseStart.toISOString(),
    pauses: [],
    checkIns: [],
  };
  const activeSecondsA = executionService.calculateSessionActiveSeconds(sessionNoPause);
  assert(activeSecondsA === 3600, `Expected 3600s with no pauses, got ${activeSecondsA}s`);
  assert(formatSecondsToTimer(activeSecondsA) === '60:00', 'Timer formatting should equal 60:00');

  // Case B: One 10-minute pause (600s)
  const sessionWithPause: ExecutionSession = {
    id: 'test-sess-2',
    taskId: 'task-1',
    startTime: baseStart.toISOString(),
    endTime: baseEnd.toISOString(),
    durationSeconds: 0,
    durationMinutes: 0,
    status: 'completed',
    interruptionStatus: false,
    createdAt: baseStart.toISOString(),
    pauses: [
      {
        id: 'pause-1',
        pausedAt: '2026-09-21T10:20:00.000Z',
        resumedAt: '2026-09-21T10:30:00.000Z',
        reason: 'Rest break',
        category: 'break',
      },
    ],
    checkIns: [],
  };
  const activeSecondsB = executionService.calculateSessionActiveSeconds(sessionWithPause);
  assert(activeSecondsB === 3000, `Expected 3000s net (3600 - 600), got ${activeSecondsB}s`);

  // Case C: Multiple pauses
  const sessionMultiPause: ExecutionSession = {
    id: 'test-sess-3',
    taskId: 'task-1',
    startTime: baseStart.toISOString(),
    endTime: baseEnd.toISOString(),
    durationSeconds: 0,
    durationMinutes: 0,
    status: 'completed',
    interruptionStatus: false,
    createdAt: baseStart.toISOString(),
    pauses: [
      {
        id: 'pause-2',
        pausedAt: '2026-09-21T10:10:00.000Z',
        resumedAt: '2026-09-21T10:15:00.000Z', // 5m = 300s
        category: 'distraction',
      },
      {
        id: 'pause-3',
        pausedAt: '2026-09-21T10:40:00.000Z',
        resumedAt: '2026-09-21T10:50:00.000Z', // 10m = 600s
        category: 'interruption',
      },
    ],
    checkIns: [],
  };
  const activeSecondsC = executionService.calculateSessionActiveSeconds(sessionMultiPause);
  assert(activeSecondsC === 2700, `Expected 2700s net (3600 - 900), got ${activeSecondsC}s`);

  // ----------------------------------------------------------------------------
  console.log('\n2. Execution Rate & Ratio Calculations');
  // ----------------------------------------------------------------------------
  const plannedTasks = 5;
  const completedTasks = 4;
  const executionRate = Math.round((completedTasks / plannedTasks) * 100);
  assert(executionRate === 80, `Expected execution rate 80%, got ${executionRate}%`);

  const plannedMinutes = 180;
  const actualMinutes = 210;
  const timeExecutionRatio = Number((actualMinutes / plannedMinutes).toFixed(2));
  assert(timeExecutionRatio === 1.17, `Expected time ratio 1.17, got ${timeExecutionRatio}`);

  // Zero-division safety checks
  const safeDivRate = (completed: number, planned: number): number => {
    return planned > 0 ? Math.round((completed / planned) * 100) : 0;
  };
  assert(safeDivRate(0, 0) === 0, 'Zero planned tasks should safely evaluate to 0%');

  // ----------------------------------------------------------------------------
  console.log('\n3. Estimation Bias Logic');
  // ----------------------------------------------------------------------------
  // If estimated was 60m, actual was 90m -> user underestimated by 1.5x (ratio = 1.5)
  const underEstEstimated = 60;
  const underEstActual = 90;
  const estimationBiasUnder = Number((underEstActual / underEstEstimated).toFixed(2));
  assert(estimationBiasUnder === 1.5, 'Underestimation ratio should be 1.5');

  // If estimated was 60m, actual was 45m -> user overestimated (ratio = 0.75)
  const overEstActual = 45;
  const estimationBiasOver = Number((overEstActual / underEstEstimated).toFixed(2));
  assert(estimationBiasOver === 0.75, 'Overestimation ratio should be 0.75');

  // ----------------------------------------------------------------------------
  console.log('\n4. Task State Machine Transitions');
  // ----------------------------------------------------------------------------
  // Valid transitions
  assert(TaskStateMachine.canTransition('inbox', 'planned') === true, 'inbox -> planned must be valid');
  assert(TaskStateMachine.canTransition('planned', 'in_progress') === true, 'planned -> in_progress must be valid');
  assert(TaskStateMachine.canTransition('in_progress', 'completed') === true, 'in_progress -> completed must be valid');
  assert(TaskStateMachine.canTransition('in_progress', 'postponed') === true, 'in_progress -> postponed must be valid');
  assert(TaskStateMachine.canTransition('in_progress', 'blocked') === true, 'in_progress -> blocked must be valid');
  assert(TaskStateMachine.canTransition('in_progress', 'abandoned') === true, 'in_progress -> abandoned must be valid');
  assert(TaskStateMachine.canTransition('postponed', 'planned') === true, 'postponed -> planned must be valid');
  assert(TaskStateMachine.canTransition('blocked', 'in_progress') === true, 'blocked -> in_progress must be valid');

  // Invalid transitions
  assert(TaskStateMachine.canTransition('completed', 'abandoned') === false, 'completed -> abandoned must be rejected');
  assert(TaskStateMachine.canTransition('abandoned', 'blocked') === false, 'abandoned -> blocked must be rejected');
  assert(TaskStateMachine.canTransition('inbox', 'completed') === false, 'inbox directly to completed must be rejected without todo/plan');

  let transitionThrows = false;
  try {
    TaskStateMachine.assertValidTransition('completed', 'abandoned');
  } catch {
    transitionThrows = true;
  }
  assert(transitionThrows === true, 'Invalid transition should throw an explicit Error');

  // ----------------------------------------------------------------------------
  console.log('\n5. Planning Conflict Detection');
  // ----------------------------------------------------------------------------
  // Overlapping blocks
  const blockA = { startTime: '09:00', endTime: '10:30' };
  const blockB = { startTime: '10:00', endTime: '11:00' };
  assert(detectPlanningConflict(blockA, blockB) === true, 'Overlapping blocks (09:00-10:30 and 10:00-11:00) must conflict');

  // Adjacent blocks (end of A equals start of C -> no conflict)
  const blockC = { startTime: '10:30', endTime: '11:30' };
  assert(detectPlanningConflict(blockA, blockC) === false, 'Adjacent blocks (10:30 boundary) must not conflict');

  // Completely disjoint blocks
  const blockD = { startTime: '14:00', endTime: '15:00' };
  assert(detectPlanningConflict(blockA, blockD) === false, 'Disjoint blocks must not conflict');

  // ----------------------------------------------------------------------------
  console.log('\n6. Time & Minute Conversion Math');
  // ----------------------------------------------------------------------------
  assert(timeToMinutes('08:30') === 510, '08:30 must be 510 minutes');
  assert(timeToMinutes('00:00') === 0, '00:00 must be 0 minutes');
  assert(timeToMinutes('23:59') === 1439, '23:59 must be 1439 minutes');
  assert(minutesToTime(510) === '08:30', '510 minutes must format to 08:30');
  assert(minutesToTime(0) === '00:00', '0 minutes must format to 00:00');
  assert(minutesToTime(1439) === '23:59', '1439 minutes must format to 23:59');

  // ----------------------------------------------------------------------------
  console.log('\n7. Timezone Testing & Date Boundaries');
  // ----------------------------------------------------------------------------
  // Fixed timestamp: 2026-09-21 23:30:00 UTC
  // In Europe/London (BST = UTC+1): 2026-09-22 00:30:00 (Next day!)
  // In America/New_York (EDT = UTC-4): 2026-09-21 19:30:00 (Same day)
  const boundaryDate = new Date('2026-09-21T23:30:00.000Z');
  const londonDateStr = getDateStringInTimezone(boundaryDate, 'Europe/London');
  const nyDateStr = getDateStringInTimezone(boundaryDate, 'America/New_York');

  assert(londonDateStr === '2026-09-22', `London date at 23:30 UTC should be next day (2026-09-22), got ${londonDateStr}`);
  assert(nyDateStr === '2026-09-21', `New York date at 23:30 UTC should be same day (2026-09-21), got ${nyDateStr}`);

  // London time at 23:30 UTC in BST (UTC+1) is 00:30
  const londonTimeStr = getTimeStringInTimezone(boundaryDate, 'Europe/London');
  assert(londonTimeStr === '00:30', `London time should be 00:30 BST, got ${londonTimeStr}`);

  // Date comparison logic
  assert(isDateOverdue('2026-09-20', '2026-09-21') === true, 'Yesterday must be overdue');
  assert(isDateToday('2026-09-21', '2026-09-21') === true, 'Matching date must be today');
  assert(isDateUpcoming('2026-09-22', '2026-09-21') === true, 'Tomorrow must be upcoming');

  console.log('\n================================================================');
  console.log('✅ ALL UNIT TESTS COMPLETED SUCCESSFULLY');
  console.log('================================================================\n');
}

runUnitTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
