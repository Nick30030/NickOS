using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace NickOS.FocusGuard.Agent
{
    class Program
    {
        private static string _serverUrl = "https://nickos.ai.studio";
        private static int _intervalSeconds = 6;
        private static string _clientId = "win_agent_" + Guid.NewGuid().ToString("N").Substring(0, 8);

        static async Task Main(string[] args)
        {
            // Load configuration
            try {
                var configPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "appsettings.json");
                if (File.Exists(configPath)) {
                    var json = File.ReadAllText(configPath);
                    using (JsonDocument doc = JsonDocument.Parse(json)) {
                        var root = doc.RootElement;
                        if (root.TryGetProperty("ServerUrl", out var url)) _serverUrl = url.GetString() ?? _serverUrl;
                        if (root.TryGetProperty("HeartbeatIntervalSeconds", out var interval)) _intervalSeconds = interval.GetInt32();
                        if (root.TryGetProperty("AgentClientId", out var id)) _clientId = id.GetString() ?? _clientId;
                    }
                }
            } catch (Exception ex) {
                Console.WriteLine($"[WARN] Could not load appsettings.json: {ex.Message}");
            }
            Console.Title = "NickOS Focus Guard - Native Windows Agent";
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("===============================================================");
            Console.WriteLine("       NICK OS FOCUS GUARD - NATIVE WINDOWS AGENT v1.0         ");
            Console.WriteLine("===============================================================");
            Console.ResetColor();
            Console.WriteLine($"[INIT] Agent Client ID: {_clientId}");
            Console.WriteLine($"[INIT] Connecting to NickOS Server at: {_serverUrl}");
            Console.WriteLine($"[INIT] Scan Interval: {_intervalSeconds}s\n");

            var apiClient = new FocusGuardApiClient(_serverUrl);
            var processEngine = new ProcessGuardEngine(enableKill: true);

            var cancellationTokenSource = new CancellationTokenSource();

            Console.CancelKeyPress += (s, e) =>
            {
                Console.WriteLine("\n[SHUTDOWN] Focus Guard agent stopping...");
                cancellationTokenSource.Cancel();
                e.Cancel = true;
            };

            while (!cancellationTokenSource.Token.IsCancellationRequested)
            {
                try
                {
                    var syncData = await apiClient.GetActiveSessionAsync();

                    if (syncData != null)
                    {
                        bool isProtectionActive = syncData.IsProtectionActive;
                        string sessionState = syncData.SessionState ?? "disconnected";
                        string taskTitle = syncData.TaskTitle ?? "Focus Session";
                        var blockedApps = syncData.Settings?.BlockedApps ?? new List<string>();

                        Console.ForegroundColor = isProtectionActive ? ConsoleColor.Green : ConsoleColor.Yellow;
                        Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] Session State: {sessionState.ToUpper()} | Protection: {(isProtectionActive ? "ARMED" : "PAUSED")} | Task: {taskTitle}");
                        Console.ResetColor();

                        string actionLog;

                        if (isProtectionActive && blockedApps.Count > 0)
                        {
                            var (terminated, log) = processEngine.EnforceBarredApps(blockedApps, taskTitle);
                            actionLog = log;
                            if (terminated > 0)
                            {
                                Console.ForegroundColor = ConsoleColor.Red;
                                Console.WriteLine($"  ⚡ [ENFORCEMENT] {log}");
                                Console.ResetColor();
                            }
                        }
                        else
                        {
                            actionLog = isProtectionActive 
                                ? "Protection active. No barred applications configured." 
                                : $"Protection paused (Session state: {sessionState}). Process enforcement suspended.";
                        }

                        // Report Heartbeat back to NickOS
                        await apiClient.SendHeartbeatAsync(
                            _clientId,
                            isProtectionActive ? "enforcing" : "paused",
                            syncData.SessionId,
                            processEngine.EnforcementCount,
                            actionLog
                        );
                    }
                    else
                    {
                        Console.ForegroundColor = ConsoleColor.DarkGray;
                        Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] Waiting for NickOS server connection at {_serverUrl}...");
                        Console.ResetColor();

                        await apiClient.SendHeartbeatAsync(
                            _clientId,
                            "disconnected",
                            null,
                            processEngine.EnforcementCount,
                            "Server unreachable",
                            "Unable to establish connection to NickOS server."
                        );
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[ERROR] Cycle error: {ex.Message}");
                }

                try
                {
                    await Task.Delay(_intervalSeconds * 1000, cancellationTokenSource.Token);
                }
                catch (TaskCanceledException)
                {
                    break;
                }
            }

            Console.WriteLine("[EXIT] Focus Guard agent terminated cleanly.");
        }
    }
}
