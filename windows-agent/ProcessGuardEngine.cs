using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;

namespace NickOS.FocusGuard.Agent
{
    /// <summary>
    /// Engine responsible for active process detection and enforcement.
    /// Distinguishes runtime detection & process termination (Process.Kill) from OS-level launch prevention.
    /// </summary>
    public class ProcessGuardEngine
    {
        private readonly bool _enableKill;
        private int _enforcementCount = 0;

        public int EnforcementCount => _enforcementCount;

        public ProcessGuardEngine(bool enableKill = true)
        {
            _enableKill = enableKill;
        }

        /// <summary>
        /// Evaluates running processes against barred application list during active focus session.
        /// </summary>
        public (int TerminatedCount, string SummaryLog) EnforceBarredApps(List<string> barredApps, string taskTitle)
        {
            if (barredApps == null || barredApps.Count == 0)
            {
                return (0, "No barred apps configured.");
            }

            int count = 0;
            var logs = new List<string>();

            // Normalize barred app names (e.g. "Discord.exe" -> "discord")
            var normalizedBarred = barredApps
                .Where(a => !string.IsNullOrWhiteSpace(a))
                .Select(a => Path.GetFileNameWithoutExtension(a.Trim()).ToLower())
                .ToHashSet();

            try
            {
                Process[] runningProcesses = Process.GetProcesses();

                foreach (var process in runningProcesses)
                {
                    try
                    {
                        string processName = process.ProcessName.ToLower();

                        if (normalizedBarred.Contains(processName))
                        {
                            logs.Add($"Detected barred process '{process.ProcessName}.exe' (PID {process.Id}) during focus on '{taskTitle}'.");

                            if (_enableKill)
                            {
                                // Attempt graceful window close first, then terminate
                                if (!process.CloseMainWindow())
                                {
                                    process.Kill();
                                }
                                count++;
                                _enforcementCount++;
                                logs.Add($"Terminated barred process '{process.ProcessName}.exe'.");
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        // Handle process access permission exceptions (e.g. system services)
                        Debug.WriteLine($"Process inspection warning: {ex.Message}");
                    }
                }
            }
            catch (Exception ex)
            {
                return (0, $"Error scanning processes: {ex.Message}");
            }

            string summary = count > 0 
                ? $"Enforced focus protection: Terminated {count} barred process(es). Details: {string.Join(" | ", logs)}"
                : "Scan complete: No barred processes detected.";

            return (count, summary);
        }
    }
}
