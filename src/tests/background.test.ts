// ==============================================================================
// NICK OS — BACKGROUND JOB ENGINE TEST SUITE
// Tests automated stale session recovery, accountability snapshot generation,
// cleanup cycles, and job observability logging.
// ==============================================================================

import { BackgroundJobEngine } from '../services/background/BackgroundJobEngine';
import { ExecutionSession, Task } from '../types/domain';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ BACKGROUND TEST FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✓ PASSED: ${message}`);
  }
}

async function runBackgroundTests() {
  console.log('\n================================================================');
  console.log('🏁 RUNNING NICK OS BACKGROUND JOBS TEST SUITE');
  console.log('================================================================\n');

  // ----------------------------------------------------------------------------
  console.log('1. Stale Focus Session Auto-Recovery');
  // ----------------------------------------------------------------------------
  const now = Date.now();
  const threeHoursAgo = new Date(now - 3 * 60 * 60 * 1000).toISOString();
  const tenMinutesAgo = new Date(now - 10 * 60 * 1000).toISOString();

  const sessions: ExecutionSession[] = [
    {
      id: 'sess-stale-1',
      taskId: 'task-1',
      startTime: threeHoursAgo,
      durationSeconds: 1800,
      status: 'active',
      interruptionStatus: false,
      createdAt: threeHoursAgo,
    },
    {
      id: 'sess-fresh-2',
      taskId: 'task-2',
      startTime: tenMinutesAgo,
      durationSeconds: 600,
      status: 'active',
      interruptionStatus: false,
      createdAt: tenMinutesAgo,
    },
    {
      id: 'sess-completed-3',
      taskId: 'task-3',
      startTime: threeHoursAgo,
      endTime: twoHoursAgo(now),
      durationSeconds: 3600,
      status: 'completed',
      interruptionStatus: false,
      createdAt: threeHoursAgo,
    },
  ];

  const state = { recoveredCallbackCalled: false };
  const result = BackgroundJobEngine.recoverStaleSessions(sessions, (recovered) => {
    state.recoveredCallbackCalled = true;
    assert(recovered.id === 'sess-stale-1', 'Callback should be called for stale session');
    assert(recovered.status === 'paused', 'Recovered session should be marked paused');
    assert(recovered.interruptionStatus === true, 'Recovered session interruptionStatus must be true');
    assert(recovered.notes?.includes('[AUTO-RECOVERED]') === true, 'Auto-recovery note should be present');
  });

  assert(result.recoveredCount === 1, `Expected 1 recovered session, got ${result.recoveredCount}`);
  assert(state.recoveredCallbackCalled === true, 'Session recovered callback should have executed');

  // Verify fresh session was NOT touched
  const freshSession = sessions.find(s => s.id === 'sess-fresh-2');
  assert(freshSession?.status === 'active', 'Fresh session (10 mins old) must remain active');

  // ----------------------------------------------------------------------------
  console.log('\n2. Daily Accountability Snapshot Reconciliation');
  // ----------------------------------------------------------------------------
  const todayStr = '2026-09-21';
  const mockTasks: Task[] = [
    {
      id: 't-1',
      title: 'Complete Core Architecture',
      status: 'completed',
      priority: 'high',
      commitmentLevel: 'hard_commitment',
      estimatedMinutes: 60,
      actualMinutes: 55,
      scheduledDate: todayStr,
      tags: [],
      checklist: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 't-2',
      title: 'Verify Google Workspace OAuth',
      status: 'completed',
      priority: 'high',
      commitmentLevel: 'hard_commitment',
      estimatedMinutes: 45,
      actualMinutes: 50,
      scheduledDate: todayStr,
      tags: [],
      checklist: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 't-3',
      title: 'Review Stale Code paths',
      status: 'postponed',
      priority: 'medium',
      commitmentLevel: 'flexible',
      estimatedMinutes: 30,
      actualMinutes: 10,
      scheduledDate: todayStr,
      tags: [],
      checklist: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const reconResult = BackgroundJobEngine.reconcileDailyAccountability(todayStr, mockTasks);
  assert(reconResult.record.plannedTasks === 3, 'Planned tasks should equal 3');
  assert(reconResult.record.completedTasks === 2, 'Completed tasks should equal 2');
  assert(reconResult.record.postponedTasks === 1, 'Postponed tasks should equal 1');
  assert(reconResult.record.executionRate === 67, `Execution rate should be 67%, got ${reconResult.record.executionRate}%`);
  assert(reconResult.record.plannedMinutes === 135, 'Planned minutes should be 60+45+30 = 135');
  assert(reconResult.record.actualMinutes === 115, 'Actual minutes should be 55+50+10 = 115');
  assert(reconResult.record.timeExecutionRatio === 0.85, `Time execution ratio should be 0.85, got ${reconResult.record.timeExecutionRatio}`);

  // ----------------------------------------------------------------------------
  console.log('\n3. Background Job Telemetry & Audit Logs');
  // ----------------------------------------------------------------------------
  const logs = BackgroundJobEngine.getJobLogs(10);
  assert(logs.length >= 2, 'Should have recorded at least 2 job execution logs');
  const staleJobLog = logs.find(l => l.jobName === 'stale_session_recovery');
  assert(staleJobLog !== undefined, 'Stale session recovery job log should exist');
  assert(staleJobLog?.status === 'completed', 'Stale job log status should be completed');
  assert(staleJobLog?.recordsProcessed === 1, 'Stale job recordsProcessed should be 1');

  // ----------------------------------------------------------------------------
  console.log('\n4. Transient Data Cleanup');
  // ----------------------------------------------------------------------------
  const cleanupRes = BackgroundJobEngine.cleanupTransientData();
  assert(typeof cleanupRes.cleanedRecords === 'number', 'Cleanup should return count of cleaned records');

  // ----------------------------------------------------------------------------
  console.log('\n5. Full Orchestration Cycle');
  // ----------------------------------------------------------------------------
  const fullCycleRes = await BackgroundJobEngine.runFullCycle({
    sessions: [],
    timeBlocks: [],
    tasks: [],
    accountabilityRecords: [],
    proposals: [],
  });
  assert(typeof fullCycleRes.staleSessionsRecovered === 'number', 'Full cycle should return recovered count');
  assert(typeof fullCycleRes.notificationsTriggered === 'number', 'Full cycle should return triggered count');
  assert(typeof fullCycleRes.cleanupCount === 'number', 'Full cycle should return cleanup count');

  console.log('\n================================================================');
  console.log('✅ ALL BACKGROUND JOB TESTS COMPLETED SUCCESSFULLY');
  console.log('================================================================\n');
  process.exit(0);
}

function twoHoursAgo(now: number): string {
  return new Date(now - 2 * 60 * 60 * 1000).toISOString();
}

runBackgroundTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
