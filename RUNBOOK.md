# NICK OS — OPERATIONAL RUNBOOK & RECOVERY PROCEDURES

**Target Audience:** System Operators, On-Call Engineers, and Nick.  
**System Classification:** High-Accountability Sovereign Execution OS  

---

## 1. Monitoring & Health Telemetry

### 1.1 Health Endpoint Triage
The primary entrypoint for operational health is:
```
GET /api/health
```

Expected healthy response:
```json
{
  "status": "healthy",
  "uptimeSeconds": 14205,
  "environment": "production",
  "memory": {
    "rssMb": 85,
    "heapUsedMb": 38,
    "heapTotalMb": 62
  },
  "ai": {
    "configured": true,
    "modelPrimary": "gemini-2.5-flash"
  },
  "notifications": {
    "queueCount": 4,
    "deviceCount": 2
  }
}
```

### 1.2 Alert Thresholds
- **HTTP 5xx error rate > 1% over 5 minutes:** Immediate investigation.
- **Heap memory usage > 350 MB:** Container restart / check memory leak in in-memory event queues.
- **AI Latency > 10,000ms:** Upstream Gemini congestion; verify fallback prompts.

---

## 2. Incident Response Playbooks

### Incident A: Application Returns 503 on AI Features
**Symptoms:** User clicks "Plan My Day" or "What Should I Do NOW?", but receives a red error banner: `GEMINI_API_KEY_MISSING` or `SERVICE_UNAVAILABLE`.

**Root Causes:**
1. `GEMINI_API_KEY` was not passed in Cloud Run environment variables or Secret Manager.
2. Gemini API quota exhausted on the active billing tier.
3. Upstream Google AI Studio endpoint transient degradation.

**Remediation:**
1. Check Cloud Run environment variables:
   ```bash
   gcloud run services describe nick-os --format="value(spec.template.spec.containers[0].env)"
   ```
2. If the secret is missing or revoked, rotate it in Secret Manager:
   ```bash
   echo -n "NEW_GEMINI_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-
   ```
3. NICK OS will automatically switch to client-side rule-based scheduling if AI is unavailable.

---

### Incident B: Active Focus Stopwatch Abandoned / Inconsistent State
**Symptoms:** Nick closed his browser during a deep work session without pausing or finishing. The task shows "In Progress" hours later.

**Remediation:**
1. NICK OS automatically checks for sessions without a heartbeat older than 120 minutes during every scheduler cycle.
2. To trigger immediate manual recovery of all orphaned sessions:
   ```bash
   curl -X POST https://your-domain.com/api/cron/stale-sessions \
     -H "x-cron-secret: YOUR_CRON_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"sessions": []}'
   ```
3. Inspect the response:
   ```json
   { "success": true, "recoveredCount": 1, "recoveredSessions": [...] }
   ```
4. Orphaned sessions are transitioned to `status: "paused"` with an auto-recovery audit note.

---

### Incident C: Database Connection Failure / Supabase Downtime
**Symptoms:** Supabase reports an incident or database paused due to inactivity.

**Remediation:**
1. NICK OS is equipped with an automatic client-side fallback to `LocalStorageRepository`. Users will experience zero data disruption or data loss.
2. Log in to [Supabase Dashboard](https://supabase.com) and click **Restore / Unpause Project**.
3. Once restored, the application seamlessly re-syncs state upon page refresh.

---

### Incident D: Google Workspace OAuth Token Expired or Revoked
**Symptoms:** Calendar or Tasks sync indicates `UNAUTHENTICATED` or `invalid_grant`.

**Remediation:**
1. Open NICK OS > **Settings > Integrations**.
2. Click **Disconnect Google Account**.
3. Click **Connect Google Calendar** to trigger the Google Identity Services popup and consent to scopes.
4. Verify sync records update immediately.

---

## 3. Database Backup & Point-in-Time Recovery (PITR)

### 3.1 Automated Supabase Backups
- Supabase performs daily automated physical backups.
- Point-in-Time Recovery (PITR) is enabled on Pro tier (retention up to 7 days).

### 3.2 Manual Sovereign Backup (pg_dump)
To take an immediate offsite snapshot of all NICK OS tables and user data:
```bash
# Export schema + data
pg_dump -h db.your-ref.supabase.co -U postgres -d postgres \
  --schema=public -F c -b -v -f nick_os_backup_$(date +%F_%H%M%S).dump

# Restore command if needed
pg_restore -h db.your-ref.supabase.co -U postgres -d postgres -v -c nick_os_backup_latest.dump
```

---

## 4. Deployment Rollback Procedures

### 4.1 Cloud Run Instant Revision Rollback
If a newly deployed container image introduces unexpected regressions:
1. List previous healthy revisions:
   ```bash
   gcloud run revisions list --service=nick-os --region=europe-west1
   ```
2. Instantly route 100% of traffic back to the previous healthy revision:
   ```bash
   gcloud run services update-traffic nick-os \
     --to-revisions=nick-os-00042-xyz=100 \
     --region=europe-west1
   ```
   *Time to execute: ~2 seconds. Zero downtime.*

### 4.2 Database Migration Rollback
If a newly applied migration needs to be reverted:
1. Revert schema changes by applying down-migration statements.
2. Restore from the pre-migration `pg_dump` snapshot.

---

## 5. Production Smoke Test Checklist (20 Workflows)

Execute this 20-point verification checklist following every major production release:

- [ ] **1. Health Diagnostic:** `GET /api/health` returns HTTP 200 with `status: "healthy"` and memory < 200MB.
- [ ] **2. Auth & Profile Initialization:** Verify user profile loads with working hours (`08:30`–`18:30`) and dark theme.
- [ ] **3. Life Areas & Goals:** Verify 4 core Life Areas (Health, Mind, Work, Personal) and goals list renders without errors.
- [ ] **4. Project Creation:** Create a test project (`PROJ-PROD-TEST`) and verify persistence across page refresh.
- [ ] **5. Task Backlog & Priority:** Create a task with priority `High` and commitment level `Hard Commitment`.
- [ ] **6. Today Planning Grid:** Schedule task onto today's program (`10:00`–`11:00`); verify conflict detector flags overlaps.
- [ ] **7. NOW Cockpit Activation:** Navigate to `/#/now`; verify active task card displays with single-click start.
- [ ] **8. Focus Stopwatch & Heartbeat:** Start session; verify stopwatch increments every second and heartbeat logs.
- [ ] **9. Pause & Distraction Logging:** Pause active session; log distraction category (`slack`/`thought`); resume session.
- [ ] **10. Session Completion:** Complete focus block; verify actual elapsed minutes update on task and in database.
- [ ] **11. Stale Session Recovery:** Execute `POST /api/cron/stale-sessions`; verify stale sessions are paused cleanly.
- [ ] **12. Accountability Reconciliation:** Navigate to `/#/accountability`; verify planned vs actual metrics compute accurately.
- [ ] **13. AI Day Planner Generation:** Click "Plan Day with AI Brain"; verify structured day proposal renders.
- [ ] **14. AI Reasoning & Unblocker:** Trigger AI unblocker on blocked task; verify actionable step breakdown.
- [ ] **15. Behavioral Learning:** Verify estimation bias and postponement ratios update in Analytics view.
- [ ] **16. Web Push & Notification Dispatch:** Trigger test notification; verify notification badge and sound.
- [ ] **17. PWA Installation & Service Worker:** Verify `sw.js` is active and registered; test standalone display mode.
- [ ] **18. Voice Command Recognition:** Test voice command ("What's next for today?"); verify speech recognition intent parsing.
- [ ] **19. Google Calendar / Tasks Sync:** Test OAuth connect flow; verify calendar timeblocks overlay without UI freeze.
- [ ] **20. Security Audit:** Verify unauthorized requests to `/api/cron/*` return HTTP 401 when `CRON_SECRET` is set.
