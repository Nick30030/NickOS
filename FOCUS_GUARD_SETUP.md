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

NickOS Focus Guard enforces a single source of truth for session status:
- `active`: Focus Guard protection is **ARMED**. Extension dynamic rules applied & Windows agent monitors active processes.
- `paused`: Focus Guard protection is **PAUSED**. Rules removed to permit rest breaks.
- `completed` / `abandoned`: Session finished. All dynamic rules revoked.
- `disconnected`: Network loss or heartbeat stale (>60s). Extension holds last known safe state until reconnected.
