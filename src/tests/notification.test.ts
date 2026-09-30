// ==============================================================================
// NICK OS — NOTIFICATION ENGINE VERIFICATION TEST SUITE
// ==============================================================================

import { ServerNotificationEngine } from '../services/notifications/ServerNotificationEngine';
import { NotificationEventType, NotificationPriority } from '../types/notification';
import { VoiceCommandService } from '../services/voice/VoiceCommandService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✓ PASSED: ${message}`);
  }
}

async function runAllTests() {
  console.log('\n================================================================');
  console.log('🏁 RUNNING NICK OS NOTIFICATION ENGINE TEST SUITE');
  console.log('================================================================\n');

  // Clear server state before starting
  ServerNotificationEngine.clearAll();

  // ----------------------------------------------------------------------------
  console.log('Test 1: Notification Creation and Status Flow');
  // ----------------------------------------------------------------------------
  const notif1 = ServerNotificationEngine.createNotification({
    userId: 'nick-sovereign',
    type: 'task_reminder',
    title: 'Review System Metrics',
    body: 'Nick OS is auditing current focus sessions.',
    priority: 'normal',
    scheduledFor: new Date().toISOString(),
    status: 'pending',
  });
  assert(notif1.id !== undefined, 'Notification should be assigned an auto-id.');
  assert(notif1.status === 'pending', 'Initial status should be pending.');
  assert(notif1.title === 'Review System Metrics', 'Notification title should be preserved.');


  // ----------------------------------------------------------------------------
  console.log('\nTest 2: Scheduled Reminders');
  // ----------------------------------------------------------------------------
  const futureIso = new Date(Date.now() + 600000).toISOString();
  const scheduledNotif = ServerNotificationEngine.createNotification({
    userId: 'nick-sovereign',
    type: 'task_reminder',
    title: 'Strategic Block',
    body: 'Deep Work starting soon.',
    priority: 'high',
    scheduledFor: futureIso,
    status: 'scheduled',
  });
  assert(scheduledNotif.status === 'scheduled', 'Notification status should be scheduled.');
  assert(scheduledNotif.scheduledFor === futureIso, 'Scheduled date should be correctly set.');


  // ----------------------------------------------------------------------------
  console.log('\nTest 3: Quiet Hours Bound Evaluation');
  // ----------------------------------------------------------------------------
  const mockPreferences = ServerNotificationEngine.getPreferences();
  
  // Standard quiet hours span 22:00 to 07:00
  const isQuietAtMidnight = ServerNotificationEngine.isQuietHours('01:30', mockPreferences);
  const isQuietAtDaytime = ServerNotificationEngine.isQuietHours('12:15', mockPreferences);
  const isQuietAtEvening = ServerNotificationEngine.isQuietHours('23:05', mockPreferences);
  
  assert(isQuietAtMidnight === true, '01:30 should fall in quiet hours.');
  assert(isQuietAtDaytime === false, '12:15 should be active operational hours.');
  assert(isQuietAtEvening === true, '23:05 should fall in quiet hours.');


  // ----------------------------------------------------------------------------
  console.log('\nTest 4: Event-Driven Triggers and Rule-Mapping');
  // ----------------------------------------------------------------------------
  // Enable notifications
  ServerNotificationEngine.updatePreferences({
    ...mockPreferences,
    enableNotifications: true,
    enableTaskReminders: true,
  });

  const eventNotif = ServerNotificationEngine.triggerEvent(NotificationEventType.TASK_STARTING, {
    taskTitle: 'Engineering Sprint',
    scheduledTime: '10:00',
    id: 'task-sprint-1'
  });
  assert(eventNotif !== null, 'Starting block event should trigger notification.');
  assert(eventNotif?.title === 'Focus Block Starting Now', 'Title should match block starting rule.');
  assert(eventNotif?.body.includes('Engineering Sprint') === true, 'Body should contain task title.');


  // ----------------------------------------------------------------------------
  console.log('\nTest 5: System Idempotency Protection');
  // ----------------------------------------------------------------------------
  // Attempt to trigger the identical event starting reminder
  const duplicateNotif = ServerNotificationEngine.triggerEvent(NotificationEventType.TASK_STARTING, {
    taskTitle: 'Engineering Sprint',
    scheduledTime: '10:00',
    id: 'task-sprint-1'
  });
  assert(duplicateNotif === null, 'Scheduler duplicate execution should be ignored.');


  // ----------------------------------------------------------------------------
  console.log('\nTest 6: User Preferences Controls');
  // ----------------------------------------------------------------------------
  ServerNotificationEngine.updatePreferences({
    ...mockPreferences,
    enableNotifications: false, // Fully disable
  });
  const disabledTrigger = ServerNotificationEngine.triggerEvent(NotificationEventType.TASK_STARTING, {
    taskTitle: 'Any task',
    id: 'any-id-2'
  });
  assert(disabledTrigger === null, 'Disabled global preferences should suppress triggers.');
  
  // Restore preferences
  ServerNotificationEngine.updatePreferences({
    ...mockPreferences,
    enableNotifications: true,
  });


  // ----------------------------------------------------------------------------
  console.log('\nTest 7: Multiple Devices Registry');
  // ----------------------------------------------------------------------------
  const dev1 = ServerNotificationEngine.registerDevice({
    id: 'dev-1',
    userId: 'nick-sovereign',
    deviceName: 'Windows PC (Firefox)',
    endpoint: 'https://updates.firefox.com/mock-endpoint-1',
    keys: { p256dh: 'sample-p256dh-1', auth: 'sample-auth-1' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  const dev2 = ServerNotificationEngine.registerDevice({
    id: 'dev-2',
    userId: 'nick-sovereign',
    deviceName: 'iPhone PWA (Safari)',
    endpoint: 'https://apple-push.com/mock-endpoint-2',
    keys: { p256dh: 'sample-p256dh-2', auth: 'sample-auth-2' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const activeDevices = ServerNotificationEngine.getDevices();
  assert(activeDevices.length === 2, 'Should register multiple devices.');
  assert(activeDevices[0].deviceName === 'Windows PC (Firefox)', 'Device name 1 should be correct.');
  assert(activeDevices[1].deviceName === 'iPhone PWA (Safari)', 'Device name 2 should be correct.');


  // ----------------------------------------------------------------------------
  console.log('\nTest 8: Database Unread List tracking');
  // ----------------------------------------------------------------------------
  const allNotifs = ServerNotificationEngine.getNotifications();
  const unread = allNotifs.filter(n => n.status !== 'read');
  assert(unread.length > 0, 'Unread list should return unread items.');


  // ----------------------------------------------------------------------------
  console.log('\nTest 9: Deep Links and Navigation Rules');
  // ----------------------------------------------------------------------------
  const aiProposalEvent = ServerNotificationEngine.triggerEvent(NotificationEventType.AI_PROPOSAL_READY, {
    proposalId: 'prop-xyz-99'
  });
  assert(aiProposalEvent?.metadata?.deepLink === '#/ai?proposalId=prop-xyz-99', 'AI proposal should deep-link correctly.');

  const accountabilityEvent = ServerNotificationEngine.triggerEvent(NotificationEventType.DAY_REVIEW_DUE, {
    unresolvedCount: 3
  });
  assert(accountabilityEvent?.metadata?.deepLink === '#/accountability', 'Accountability alerts should link to review screen.');


  // ----------------------------------------------------------------------------
  console.log('\nTest 10: Server Scheduler Periodic Evaluation Logic');
  // ----------------------------------------------------------------------------
  // Mock time block starting in exactly 10 minutes (matching lead time preference)
  const leadTimeBlock = {
    id: 'tb-lead-1',
    title: 'Prepare Client Brief',
    startTime: '14:40',
    endTime: '15:40',
    status: 'scheduled',
    taskId: 'task-client-1',
  };

  const currentMockTime = '14:30'; // Exactly 10 minutes before start time

  const generated = ServerNotificationEngine.runSchedulingCycle(
    [leadTimeBlock],
    [{ id: 'task-client-1', title: 'Prepare Client Brief' }],
    [],
    [],
    currentMockTime
  );

  assert(generated.length === 1, 'Scheduler periodic evaluation should generate reminder.');
  assert(generated[0].title === 'Upcoming Block reminder', 'Should flag the upcoming block lead notice.');


  // ----------------------------------------------------------------------------
  console.log('\nTest 11: Push Delivery Failure Graceful Handlers');
  // ----------------------------------------------------------------------------
  // Force delete a device to simulate delivery skip or channel failure
  ServerNotificationEngine.removeDevice('https://updates.firefox.com/mock-endpoint-1');
  const remainingDevices = ServerNotificationEngine.getDevices();
  assert(remainingDevices.length === 1, 'Should safely remove device registration.');


  // ----------------------------------------------------------------------------
  console.log('\nTest 12: Voice-Ready Semantic Abstraction');
  // ----------------------------------------------------------------------------
  // Warm up and test the voice semantic matching system
  const voiceResult = await VoiceCommandService.processTranscript("What's next for today?");
  assert(voiceResult.success === true, 'Voice Command processor should succeed.');
  assert(voiceResult.actionDetected === 'WHATS_NEXT', 'Should detect correct semantic action.');

  const startResult = await VoiceCommandService.processTranscript("Start coding review task");
  assert(startResult.success === true, 'Start command should register successfully.');
  assert(startResult.parameters?.taskQuery === 'coding review task', 'Should correctly extract task name.');

  console.log('\n================================================================');
  console.log('✅ ALL NOTIFICATION ENGINE & MOBILE COMPANION TESTS COMPLETED');
  console.log('================================================================\n');
  process.exit(0);
}

runAllTests().catch((err) => {
  console.error('Test Suite Failed with unexpected error:', err);
  process.exit(1);
});
