# Plan for Gamification and Voice Memo Recording

## Objective
Enhance user engagement through gamification and enable direct voice memo recording from the computer.

## Gamification (Addictiveness)
- **Streaks & Rewards**: Implement a streak counter in the UI. Tracking daily task completion.
- **Visual Feedback**: Add CSS-based animations for progress updates when tasks are completed.
- **Auditory Feedback**: Add subtle sound effects for task completion using the Web Audio API.
- **Self-Competition (Milestones)**: Create a new "Personal Records" section to display statistics (longest streak, tasks completed today vs total, etc.).

## Voice Memo Recording
- **Component**: Create a `VoiceRecorder` component with Start/Stop recording functionality.
- **Technology**: Use the browser's `MediaRecorder` API to capture microphone input.
- **Storage**: Save recordings as Blobs and provide a way to listen to them or attach them to tasks/inbox.
- **UI**: Integrate the recording button into the Command Center.

## Implementation Steps
1. **Gamification Engine**:
   - Create `GamificationContext.tsx` to handle state (streak, total completion, milestones).
   - Add sound effect triggers in `ExecutionContext.tsx` on `completeTask`.
   - Implement animations in task components.
2. **Recording Functionality**:
   - Add `MediaRecorder` hook for audio capture.
   - Design the "REC" button UI.
   - Integrate recording storage in the existing data flow (link to tasks or Inbox).
3. **Dashboard**:
   - Add a "Personal Records" card to the `DashboardView`.
