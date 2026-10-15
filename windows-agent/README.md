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
Run directly via .NET CLI:
```cmd
dotnet run
```
Or launch the compiled binary:
```cmd
.\bin\Release\net8.0-windows\NickOS.FocusGuard.Agent.exe
```

### 3. Autostart at Windows Startup (Optional)
To have the agent launch automatically at login without admin elevation:
1. Press `Win + R`, type `shell:startup` and hit Enter.
2. Create a shortcut to `NickOS.FocusGuard.Agent.exe` inside the Startup folder.
