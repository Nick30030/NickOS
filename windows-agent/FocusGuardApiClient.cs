using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace NickOS.FocusGuard.Agent
{
    public class FocusSessionSyncDto
    {
        public bool IsProtectionActive { get; set; }
        public string? SessionState { get; set; }
        public string? SessionId { get; set; }
        public string? TaskId { get; set; }
        public string? TaskTitle { get; set; }
        public FocusGuardSettingsDto? Settings { get; set; }
    }

    public class FocusGuardSettingsDto
    {
        public bool Enabled { get; set; }
        public string Mode { get; set; } = "blacklist";
        public List<string> AllowedDomains { get; set; } = new();
        public List<string> BlockedDomains { get; set; } = new();
        public List<string> BlockedApps { get; set; } = new();
        public string UnknownSitePolicy { get; set; } = "allow";
    }

    public class FocusGuardApiClient
    {
        private readonly HttpClient _httpClient;
        private readonly string _baseUrl;

        public FocusGuardApiClient(string baseUrl)
        {
            _baseUrl = baseUrl.TrimEnd('/');
            _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
        }

        public async Task<FocusSessionSyncDto?> GetActiveSessionAsync()
        {
            try {
                var response = await _httpClient.GetAsync($"{_baseUrl}/api/focus-guard/active-session");
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                    return JsonSerializer.Deserialize<FocusSessionSyncDto>(json, options);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[FocusGuard Agent] Network error connecting to NickOS: {ex.Message}");
            }
            return null;
        }

        public async Task SendHeartbeatAsync(string clientId, string status, string? activeSessionId, int blockedCount, string actionLog, string? errorMessage = null)
        {
            try
            {
                var payload = new
                {
                    clientId,
                    clientType = "windows_agent",
                    version = "1.0.0",
                    status,
                    activeSessionId,
                    blockedEnforcementsCount = blockedCount,
                    lastActionLog = actionLog,
                    errorMessage
                };

                var json = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                await _httpClient.PostAsync($"{_baseUrl}/api/focus-guard/heartbeat", content);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[FocusGuard Agent] Heartbeat error: {ex.Message}");
            }
        }
    }
}
