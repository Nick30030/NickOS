# NickOS Focus Guard — Native Windows Agent (.NET 8)

The **NickOS Focus Guard Native Windows Agent** is a lightweight companion process designed to run in the background on Windows machines. It communicates with the NickOS server to monitor and enforce application restrictions during active focus sessions.

---

## 🎯 Architecture & Capabilities

1. **Active Focus Session Synchronization**:
   - Polls `/api/focus-guard/active-session` every 6 seconds.
   - Enforces process restrictions **ONLY** when a real execution session is status = `active`.
   - Automatically pauses enforcement during session pauses, rest breaks, or when no active session exists.

2. **Process Enforcement Mechanism**:
   - Enumerates running processes via `System.Diagnostics.Process.GetProcesses()`.
   - Case-insensitive process matching against configured executable names (e.g. `Discord.exe`, `Steam.exe`, `Spotify.exe`, `League of Legends.exe`).
   - Attempts graceful window closure (`Process.CloseMainWindow()`) before calling `Process.Kill()`.

3. **Architectural Distinction: Process Termination vs Launch Prevention**:
   - **V1 (Current Implementation)**: Scans active process list periodically and terminates barred processes when detected (`Process.Kill()`).
   - **V2 / OS-Level Launch Prevention Options**: For absolute zero-latency launch prevention without process creation, integrate Windows AppLocker or Software Restriction Policies (SRP) via PowerShell / WMI policy configuration or Windows Job Objects (`CreateJobObject` with process limit flags).

4. **Heartbeat & Telemetry**:
   - Sends real-time client status, version, total process terminations, and diagnostic logs to NickOS.
   - Visible in NickOS Settings > Focus Guard Diagnostics widget.

---

## 🚀 Compilation & Installation Guide

### Prerequisites
- Windows 10 or 11
- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)

### 1. Compilation
From the `windows-agent` directory in PowerShell or Command Prompt:

```cmd
dotnet build NickOS.FocusGuard.Agent.csproj -c Release
```

### 2. Execution
Set `ServerUrl` in `appsettings.json` to the exact origin you open for NickOS in
your browser (scheme and hostname, without a page path). The build copies this
file beside the executable. `http://localhost:3000` only works if NickOS is running
on the same PC. A cloud deployment must use its actual HTTPS address.

Run directly via .NET CLI:
```cmd
dotnet run
```
You can override the configured address explicitly:

```powershell
dotnet run -- --server https://your-nickos-host
```
Or launch the compiled binary:
```cmd
.\bin\Release\net8.0-windows\NickOS.FocusGuard.Agent.exe
```

### Troubleshooting DISCONNECTED / PAUSED

`Session State: DISCONNECTED | Protection: PAUSED` means the API was reached but
has no fresh active focus session. It is different from the agent's
`Waiting for NickOS server connection` message, which indicates a failed request.

1. Compare the agent's `[INIT] Connecting to NickOS Server at:` address with the
   NickOS address in your browser. They must use the same deployment.
2. Keep NickOS open, enable Focus Guard in settings, and start or resume an actual
   focus session. Merely selecting a task does not start protection.
3. The web app syncs every 10 seconds. The server marks an active session
   disconnected after 60 seconds without a sync (for example, after closing or
   suspending the app). Keep the app awake and allow a sync cycle after resuming.
4. Open `/api/focus-guard/active-session` on that same deployment to inspect
   `sessionState` and `isProtectionActive`. An HTML login page, HTTP error, or a
   different deployment cannot supply the agent's session state.

The task label `Focus Session` is a fallback when no task title was received; it
does not prove that a focus session is running. The server stores this state in
memory, so a restart clears it and multiple server instances may disagree.

### 3. Autostart at Windows Startup (Optional)
To have the agent launch automatically at login without admin elevation:
1. Press `Win + R`, type `shell:startup` and hit Enter.
2. Create a shortcut to `NickOS.FocusGuard.Agent.exe` inside the Startup folder.
