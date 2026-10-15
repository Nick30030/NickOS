# NickOS Focus Guard — Deployment & Setup Guide

**NickOS Focus Guard** is an end-to-end execution protection matrix that coordinates:
1. **NickOS Web App**: Central configuration UI, Supabase database storage with Row Level Security (RLS), and active session state engine.
2. **Chrome / Edge Extension (Manifest V3)**: Dynamic `declarativeNetRequest` browser engine blocking prohibited domains in Blacklist mode or unauthorized domains in Whitelist (Monk) mode.
3. **Native Windows Agent (.NET 8)**: Process monitoring companion closing barred desktop applications during active focus sessions.

---

## 🗄️ 1. Supabase Database Migration & RLS Setup

Apply the migration script located at `/supabase/migrations/20260930000005_focus_guard_settings.sql` in your Supabase SQL Editor:

```sql
-- Creates focus_guard_settings and focus_guard_agent_heartbeats tables with strict RLS
\i supabase/migrations/20260930000005_focus_guard_settings.sql
```

### Verified RLS Security Principles:
- Table `focus_guard_settings` enforces `using (auth.uid() = user_id)`.
- Table `focus_guard_agent_heartbeats` enforces `using (auth.uid() = user_id)`.
- Authenticated JWT token is required for all database operations. The `service_role` key is **never** exposed to browser, extension, or Windows binaries.

---

## 🌐 2. Chrome & Edge Browser Extension Installation (Manifest V3)

1. Open **Google Chrome** or **Microsoft Edge**.
2. Navigate to `chrome://extensions` or `edge://extensions`.
3. Enable **Developer mode** toggle in the top-right corner.
4. Click **Load unpacked** (or **Charger l'extension non empaquetée**).
5. Select the `/extension` directory inside your NickOS repository.
6. Click the extension icon in your browser toolbar to view real-time domain evaluation diagnostics.
7. In the extension's **Options**, set the server origin to the same address as the running NickOS web app, then save. The options page reports whether the API synchronization succeeds. After updating extension files, reload the extension on `chrome://extensions` / `edge://extensions` and reopen the popup.

---

## 🖥️ 3. Native Windows Agent (.NET 8) Setup

1. Ensure [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) is installed.
2. Navigate to the `/windows-agent` directory in your terminal:
   ```cmd
   cd windows-agent
   dotnet build NickOS.FocusGuard.Agent.csproj -c Release
   dotnet run
   ```
3. Set `ServerUrl` in `windows-agent/appsettings.json` to the same NickOS origin used in your browser, or run `dotnet run -- --server https://your-nickos-host`. Use `http://localhost:3000` only when NickOS runs on that same PC. The agent polls that server for active focus sessions and monitors processes listed in your `blockedApps` settings. See `windows-agent/README.md` for disconnected-session troubleshooting.

---

## 🔄 4. Reliability & Session Single Source of Truth

Start a real focus session using **Démarrer le Focus** in the NOW cockpit. This
starts/resumes the execution session and opens the Focus overlay. Selecting a task
alone does not arm protection. Persisted settings accompany the session sync every
10 seconds after loading; agent diagnostics read the server's live heartbeats.

The current live Focus Guard API holds one shared session in server memory.
An idle browser without a session cannot overwrite that session. It is still a
single-user, single-server-instance design: independent active sessions are not
isolated per user, a server restart clears live state, and multiple server
instances do not share it. Authenticated per-user state in a shared backend is
required before treating this as a multi-user or multi-instance service.

NickOS Focus Guard enforces a single source of truth for session status:
- `active`: Focus Guard protection is **ARMED**. Extension dynamic rules applied & Windows agent monitors active processes.
- `paused`: Focus Guard protection is **PAUSED**. Rules removed to permit rest breaks.
- `completed` / `abandoned`: Session finished. All dynamic rules revoked.
- `disconnected`: Network loss or heartbeat stale (>60s). Extension holds last known safe state until reconnected.

Chrome polls through a service-worker alarm every 30 seconds (the supported
minimum), or immediately using **Force Sync Matrix**. The popup reports errors
instead of claiming enforcement if Chrome rejects the rules. The web app must
remain awake to keep its session sync fresh.

## 5. Regression checks

Install dependencies, then run:

```sh
npm install --no-package-lock
npm run lint
npm test
npm run build
```

`npm test` includes real Express route tests and tests executing the extension
worker with simulated Chrome APIs (including failed rule installation and retry).
For the real browser application flow, start an **isolated local test server**:

```sh
PORT=3002 NODE_ENV=production npm start
```

In a second terminal, run:

```sh
npx playwright install chromium
FOCUS_GUARD_BASE_URL=http://127.0.0.1:3002 npm run test:focus-browser
```

If Chromium is already installed, skip downloading it and set
`CHROMIUM_EXECUTABLE=/usr/bin/chromium` (or its actual path). The browser test uses
fresh local profiles and checks startup settings, start/pause/resume/completion,
page reload, idle-profile interference and agent diagnostics. It does not load the
extension or close Windows applications; verify real navigation blocking and the
Windows agent separately on the target PC.
