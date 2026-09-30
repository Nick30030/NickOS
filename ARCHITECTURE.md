# NICK OS — PRODUCTION ARCHITECTURE

**System Version:** 1.0.0-foundation  
**System Type:** Sovereign Personal Execution Operating System & Accountability Engine  
**Environment:** Cloud Run Container (Port 3000) / Node.js 20 ESM / React 19 + TypeScript  

---

## 1. Executive Architectural Overview

NICK OS is designed as an uncompromising, high-accountability personal execution platform. It replaces generic todo lists with deterministic state-machine driven timeblocks, active focus cockpit tracking with heartbeat telemetry, behavioral learning algorithms (measuring estimation bias and postponement patterns), AI-assisted daily program synthesis, and multi-channel push and voice notifications.

The application follows a **dual-mode resilient architecture**:
1. **Cloud-First Mode:** Persistent Supabase PostgreSQL 15+ database with Row Level Security (RLS), ACID foreign keys, and performant compound indexes.
2. **Local-First Resilient Mode:** Fully functional client-side fallback using `SafeStorage` and `LocalStorageRepository`, guaranteeing zero data loss during network outages or infrastructure migrations.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT TIER (BROWSER & PWA)                   │
│                                                                         │
│  React 19 SPA (Vite)  •  Tailwind CSS v4  •  Motion Layout Transitions   │
│  NOW Cockpit  •  Today Planner  •  Master Tasks  •  Accountability Hub  │
│  Web Speech API (TTS/STT)  •  Service Worker (sw.js Web Push & Cache)   │
└──────────────────┬─────────────────────────────────┬────────────────────┘
                   │ HTTPS API & SSE                 │ GIS Client OAuth
                   ▼                                 ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────┐
│     BACKEND API GATEWAY (server.ts)  │  │    GOOGLE WORKSPACE CLOUD     │
│                                      │  │                               │
│  Express 4 / Node 20 Runtime         │  │  • Google Calendar API v3     │
│  Port 3000 Ingress                   │  │  • Google Tasks API v1        │
│  Security Headers (CSP, HSTS)        │  │  (Client-side token exchange; │
│  Sliding Window Rate Limiters        │  │   Zero server secrets leak)   │
│  Cache Control (no-store for APIs)   │  └───────────────────────────────┘
│  /api/health (Diagnostic telemetry)  │
│  /api/ai/* (Gemini proxy gateway)    │
│  /api/cron/* (Secret-gated jobs)     │
└──────────────┬───────────────────────┘
               │
      ┌────────┴───────────────────────────────────────────┐
      ▼                                                    ▼
┌───────────────────────────────┐        ┌────────────────────────────────┐
│      GEMINI AI BRAIN          │        │    SUPABASE POSTGRESQL (CLOUD) │
│                               │        │                                │
│  • Google GenAI SDK           │        │  • 12 Relational Tables        │
│  • Gemini 2.5 Flash           │        │  • Strict Row Level Security   │
│  • Day Planner Synthesis      │        │  • Automatic updated_at triggers│
│  • NOW Reasoning Engine       │        │  • 18 Optimized B-Tree Indexes │
│  • Blocker Deconstruction     │        │  • PITR & Daily WAL Backups    │
└───────────────────────────────┘        └────────────────────────────────┘
```

---

## 2. Subsystem Architecture

### 2.1 Frontend Tier
- **Framework:** React 19.0.1, TypeScript 5.8+ (Strict Mode).
- **Styling:** Tailwind CSS v4 using modern `@import "tailwindcss";` pipeline.
- **Icons & Animation:** `lucide-react` vector iconography; `motion` for layout and route animations.
- **State Architecture:** Context API (`ExecutionSessionContext`) coupled with deterministic services (`TaskStateMachine`, `BehaviorEngine`, `AdaptiveLearningService`).
- **PWA & Offline:** Web App Manifest (`manifest.json`) supporting standalone display, shortcut intents (`/#/now`, `/#/today`, `/#/capture`), and Service Worker (`sw.js`) managing background push notifications, badge updates, and deep-link click routing.
- **Audio & Speech:** Integrated Web Speech Synthesis API and Web Speech Recognition via `VoiceService` and `VoiceCommandService` with natural-language command classification.

### 2.2 Backend API & Execution Tier (`server.ts`)
- **Server:** Node.js Express server running behind reverse proxy on `0.0.0.0:3000`.
- **Static Assets:** Serves production Vite bundles from `dist/` with immutable asset caching and SPA index fallback.
- **Development Mode:** Injects Vite middleware dynamically for HMR-compliant local development.
- **Security Middlewares:**
  - `nosniff`, `SAMEORIGIN`, `strict-origin-when-cross-origin`, and `X-XSS-Protection` headers.
  - Strict Cache-Control (`no-store, no-cache, must-revalidate`) on `/api/*` endpoints to prevent stale operational states.
- **Rate Limiting:**
  - General API Limiter: 150 requests / minute per IP.
  - Dedicated AI Limiter: 25 requests / minute per IP.
- **Health & Diagnostic Subsystem (`GET /api/health`):**
  - Reports status, uptime, RSS/Heap memory allocations, AI configuration status, notification queue depth, and background job telemetry.

### 2.3 Database Tier (Supabase / PostgreSQL)
- **Engine:** PostgreSQL 15+ hosted on Supabase.
- **Schema Foundation:**
  1. `profiles`: Nick's sovereign account, working hours, active focus pointer.
  2. `life_areas`: High-level domains (Health, Mind, Work, Personal).
  3. `goals`: Strategic milestones and progress tracking.
  4. `projects`: Active projects mapped to goals and life areas.
  5. `tasks`: Actionable tasks with commitment levels (`hard_commitment`, `flexible`, `stretch`).
  6. `daily_plans`: Planned day programs with energy targets and constraints.
  7. `time_blocks`: Granular timeblocks within daily plans with conflict detection.
  8. `execution_sessions`: Millisecond-accurate focus tracking with heartbeat telemetry, pauses, check-ins, and interruption reasons.
  9. `inbox_items`: Rapid capture inbox preventing cognitive dispersion.
  10. `accountability_records`: Immutable daily reconciliation records (planned vs actual, execution rate, time execution ratio).
  11. `commitments`: Non-negotiable daily execution contracts.
  12. `notifications`: Multi-device push notification log and status tracking.
  13. `push_subscriptions`: Web Push browser registration tokens.
  14. `background_job_logs`: Execution logs for automated background jobs.
  15. `idempotency_keys`: Multi-instance deduplication keys with TTL expiration.
- **Row Level Security (RLS):** Enabled across all tables. Strict `auth.uid() = user_id` isolation prevents cross-tenant access.

### 2.4 AI Integration (Gemini AI Brain)
- **SDK:** `@google/genai` (v2.4.0) initialized server-side with `process.env.GEMINI_API_KEY`.
- **Model Selection:** `gemini-2.5-flash` for day planning synthesis, NOW situational reasoning, task breakdown, and blocked-state triage.
- **Security:** The Gemini API key is strictly server-side. The browser never receives or handles Gemini secrets.
- **Graceful Fallbacks:** If the key is unset or rate-limited, endpoints return structured errors (`GEMINI_API_KEY_MISSING` / `RATE_LIMIT_EXCEEDED`) allowing client-side graceful degradation to rule-based algorithms.

### 2.5 Google Workspace Integrations
- **Protocols:** Google Calendar API v3 and Google Tasks API v1.
- **Authentication:** Client-side Google Identity Services (GIS) token client (`initTokenClient`) using public client ID (`VITE_GOOGLE_CLIENT_ID`).
- **Security:** No client secret is used or stored on the server. OAuth access tokens reside in client memory/storage and are transmitted directly to Google's official endpoints.
- **Sync Mappings:** Local and remote bidirectional sync identifiers prevent duplicate event creation.

### 2.6 Notification & Web Push Subsystem
- **Engine:** `ServerNotificationEngine.ts` provides event-driven trigger dispatching and time-based periodic evaluation.
- **Rule Matrix:**
  - `TASK_DUE_SOON`: 10-minute advance warning before planned block start.
  - `TASK_STARTING`: Punctual alert at block start time.
  - `TASK_OVERDUE`: High-priority escalation when block elapsed with unresolved status.
  - `DAY_REVIEW_DUE`: Triggered at configured accountability review time (default 21:00).
  - `COMMITMENT_MISSED`: Critical escalation requiring explicit reconciliation.
- **Quiet Hours:** Configurable window (default 22:00–07:00) where low/normal notifications are held as scheduled, while critical security/commitment breaches bypass the filter.
- **Deduplication:** Unique idempotency keys (e.g. `start:tb-101:10:00`) prevent multiple alerts for the same event.

### 2.7 Background Task & Scheduled Job Engine (`BackgroundJobEngine.ts`)
- **Stale Session Recovery:** Inspects active execution sessions. If no heartbeat or user activity was logged for > 120 minutes, automatically pauses the session, logs an auto-recovery note, and marks `interruptionStatus: true`.
- **Daily Accountability Reconciliation:** Auto-aggregates planned vs actual metrics at end-of-day.
- **Data Cleanup:** Automatically purges expired idempotency keys and prunes job logs older than retention limits.
- **External Cron Triggers:** Cloud schedulers invoke `/api/cron/*` endpoints protected by `CRON_SECRET`.

---

## 3. Bottlenecks & Single Points of Failure (SPOFs)

| Component | Potential Risk | Mitigation in Architecture |
|---|---|---|
| **Gemini API** | Quota exhaustion, network timeout, upstream 503 | Server-side sliding rate limiter (25 req/min); timeout boundaries; UI fallback to manual rule-based scheduling. |
| **Server-side Schedulers** | Container restart pauses in-process `setInterval` | Endpoints exposed under `/api/cron/*` for external Cloud Scheduler / GitHub Action trigger; state persisted in DB. |
| **Supabase Outage** | Network partition, free-tier pause, DB migration | `LocalStorageRepository` acts as instant transparent fallback; app continues execution and syncs when reconnected. |
| **Focus Session Abandonment** | Browser crash or closed laptop leaves session running | `BackgroundJobEngine.recoverStaleSessions()` auto-closes sessions inactive > 2 hours. |
| **Notification Flooding** | Multiple rapid status changes | Deterministic idempotency key registry drops duplicate events. |

---

## 4. Horizontal Scalability Roadmap

1. **Stateless Backend Nodes:**
   - Server notification state and device tokens are structured into PostgreSQL (`public.notifications`, `public.push_subscriptions`).
   - Rate limiting currently uses in-memory sliding maps; for multi-instance clusters, swap memory maps with Redis or Cloud Memorystore tokens.
2. **Database Query Scaling:**
   - All time-series and filtered queries are backed by compound indexes (`idx_tasks_user_priority_status`, `idx_time_blocks_user_start`, `idx_execution_sessions_user_start`).
   - Database reads for analytics can be offloaded to read replicas if query volume exceeds 1,000 req/sec.
3. **Web Push Delivery:**
   - Push subscriptions are batched. For thousands of push subscribers, dispatch via Google Cloud Pub/Sub worker queue.
