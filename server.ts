import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { ServerNotificationEngine } from "./src/services/notifications/ServerNotificationEngine";
import { NotificationEventType } from "./src/types/notification";
import { BackgroundJobEngine } from "./src/services/background/BackgroundJobEngine";
import { ObservabilityService } from "./src/services/observability/ObservabilityService";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "5mb" }));

// Security & No-Cache Headers for API
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  if (req.path.startsWith("/api")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  }
  next();
});

// General API Rate Limiter (150 requests per minute per IP)
const generalRateLimitMap = new Map<string, { count: number; resetTime: number }>();
const GENERAL_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const GENERAL_RATE_LIMIT_MAX = 150;

app.use("/api", (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  let record = generalRateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + GENERAL_RATE_LIMIT_WINDOW_MS };
    generalRateLimitMap.set(ip, record);
    return next();
  }

  record.count++;
  if (record.count > GENERAL_RATE_LIMIT_MAX) {
    console.warn(`[SECURITY WARNING] General API rate limit exceeded for IP: ${ip}`);
    return res.status(429).json({
      error: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please slow down.",
    });
  }
  next();
});

// Simple Sliding Window Rate Limiter for AI Endpoints
const aiRateLimitMap = new Map<string, { count: number; resetTime: number }>();
const AI_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const AI_RATE_LIMIT_MAX = 25; // max 25 AI requests per minute per IP

app.use("/api/ai/", (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  let record = aiRateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + AI_RATE_LIMIT_WINDOW_MS };
    aiRateLimitMap.set(ip, record);
    return next();
  }

  record.count++;
  if (record.count > AI_RATE_LIMIT_MAX) {
    console.warn(`[SECURITY WARNING] Rate limit exceeded for IP: ${ip} on AI endpoints.`);
    return res.status(429).json({
      error: "RATE_LIMIT_EXCEEDED",
      message: "Too many AI requests. Please wait a minute before requesting another planning generation.",
    });
  }
  next();
});

// Server-side Gemini Client Initialization
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
  console.log("NICK OS AI BRAIN: Gemini Client initialized successfully.");
} else {
  console.warn("NICK OS AI BRAIN WARNING: GEMINI_API_KEY environment variable is not set. AI capabilities will return graceful error messages instructing the user to configure their key.");
}

// AI Observability logging helper
function logAiOperation(type: string, success: boolean, latency: number, details?: string) {
  console.log(`[AI-OBSERVABILITY] Type: ${type} | Success: ${success} | Latency: ${latency}ms ${details ? `| Info: ${details}` : ""}`);
}

// Helper to check Gemini availability
function ensureGeminiClient(res: express.Response): boolean {
  if (!ai) {
    res.status(503).json({
      error: "GEMINI_API_KEY_MISSING",
      message: "The NICK OS AI BRAIN requires a Gemini API key. Please configure GEMINI_API_KEY in your Settings > Secrets panel on the left/top menu in Google AI Studio.",
    });
    return false;
  }
  return true;
}

// ============================================================================
// 1. "PLAN MY DAY" ENDPOINT
// ============================================================================
app.post("/api/ai/plan-day", async (req, res) => {
  const startTime = Date.now();
  if (!ensureGeminiClient(res)) return;

  try {
    const { context } = req.body;
    if (!context) {
      return res.status(400).json({ error: "Missing context payload." });
    }

    const systemInstruction = 
      "You are NICK OS AI BRAIN, the elite, high-performance personal analytical assistant for Nick.\n" +
      "Nick is the sole sovereign decision maker. Your job is to analyze, propose, execute, and hold him accountable, but NEVER override his decisions.\n" +
      "Analyze Nick's active goals, projects, priorities, and his daily/weekly accountability history.\n" +
      "Use the provided `behaviorProfile` (including estimation_bias, common blockers, time-of-day execution skews, context switches, and daily capacity) to scale up task estimations if estimation bias > 1.0, suggest appropriate buffers, avoid excessive context switching, and align tasks into his highest-performing periods.\n" +
      "Then, suggest a high-impact daily plan utilizing the structured schema. Prioritize critical/high tasks and align time blocks to preferred working hours.";

    const prompt = `Here is Nick's current state, historical data, and adaptive behavior profile:
${JSON.stringify(context, null, 2)}

Provide an upgraded, highly optimal PlanningProposal for today. Ensure the suggested schedule uses existing high-priority tasks, incorporates buffers according to his capacity patterns, and accounts for his estimation bias. The suggested start and end times should reflect realistic execution windows.`;

    const response = await ai!.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Title of the proposal" },
            reason: { type: Type.STRING, description: "High-level strategic reason for this plan" },
            task_ids: { type: Type.ARRAY, items: { type: Type.STRING }, description: "IDs of tasks scheduled in this plan" },
            suggested_start: { type: Type.STRING, description: "Suggested start of the block (e.g. 08:30)" },
            suggested_end: { type: Type.STRING, description: "Suggested end of the block (e.g. 18:30)" },
            priority: { type: Type.STRING, description: "Overall plan priority: critical, high, medium, low" },
            confidence: { type: Type.NUMBER, description: "Your confidence score in this plan (0.0 to 1.0)" },
            explanation: { type: Type.STRING, description: "Detailed contextual explanation of why this plan was formed and how it overcomes recent execution variance or interruptions" },
            buffer_time: { type: Type.STRING, description: "Specific description of recommended buffer time in minutes based on capacity patterns" },
            assumptions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Key assumptions made when structuring this schedule (e.g. capacity limit, fatigue hours)" },
            time_blocks: {
              type: Type.ARRAY,
              description: "Structured daily program/time blocks",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Time block title" },
                  blockType: { type: Type.STRING, description: "Type: deep_work, shallow_work, routine, exercise, spirituality, learning, buffer, break, admin, rest, social, other" },
                  startTime: { type: Type.STRING, description: "Block start (HH:MM)" },
                  endTime: { type: Type.STRING, description: "Block end (HH:MM)" },
                  taskId: { type: Type.STRING, description: "Optional ID of a linked task to execute during this block" }
                },
                required: ["title", "blockType", "startTime", "endTime"]
              }
            }
          },
          required: ["title", "reason", "task_ids", "suggested_start", "suggested_end", "priority", "confidence", "explanation", "buffer_time", "assumptions", "time_blocks"]
        }
      }
    });

    const parsedResponse = JSON.parse(response.text || "{}");
    logAiOperation("plan_day", true, Date.now() - startTime);
    res.json(parsedResponse);
  } catch (err: any) {
    logAiOperation("plan_day", false, Date.now() - startTime, err.message);
    res.status(500).json({ error: "AI_GENERATION_FAILED", message: err.message });
  }
});

// ============================================================================
// 2. "WHAT SHOULD I DO NOW" CONTEXTUAL EXPLAINER
// ============================================================================
app.post("/api/ai/now-reasoning", async (req, res) => {
  const startTime = Date.now();
  if (!ensureGeminiClient(res)) return;

  try {
    const { task, context } = req.body;
    if (!task) {
      return res.status(400).json({ error: "Missing active task." });
    }

    const systemInstruction = 
      "You are NICK OS AI BRAIN, the elite, high-performance executive coach.\n" +
      "A task is active in Nick's cockpit. Explain why this task matters, the immediate tangible outcome to achieve first, and how to stay highly focused.";

    const prompt = `Active Task:
${JSON.stringify(task, null, 2)}

Nick's Broader Context:
${JSON.stringify(context, null, 2)}

Provide structured explanation, first physical action, and focus tips.`;

    const response = await ai!.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            why_it_matters: { type: Type.STRING, description: "Strategic connection to projects/goals" },
            tangible_outcome: { type: Type.STRING, description: "The specific concrete artifact/outcome to deliver in this block" },
            first_action: { type: Type.STRING, description: "The single simple physical action to start immediately (microstep)" },
            sub_steps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Logical progression flow for this session" },
            focus_strategy: { type: Type.STRING, description: "Tips to mitigate distraction for this particular task type" }
          },
          required: ["why_it_matters", "tangible_outcome", "first_action", "sub_steps", "focus_strategy"]
        }
      }
    });

    const parsedResponse = JSON.parse(response.text || "{}");
    logAiOperation("now_reasoning", true, Date.now() - startTime);
    res.json(parsedResponse);
  } catch (err: any) {
    logAiOperation("now_reasoning", false, Date.now() - startTime, err.message);
    res.status(500).json({ error: "AI_GENERATION_FAILED", message: err.message });
  }
});

// ============================================================================
// 3. "BREAK THIS TASK DOWN" ENDPOINT
// ============================================================================
app.post("/api/ai/break-down", async (req, res) => {
  const startTime = Date.now();
  if (!ensureGeminiClient(res)) return;

  try {
    const { taskTitle, taskDescription } = req.body;
    if (!taskTitle) {
      return res.status(400).json({ error: "Missing task title." });
    }

    const systemInstruction = 
      "You are NICK OS AI BRAIN, a micro-execution delivery engine.\n" +
      "Break vague tasks down into a sequence of concrete, unambiguous, physical deliverables and checklists. Do not output vague activities; output testable achievements.";

    const prompt = `Break down the following task:
Title: ${taskTitle}
Description: ${taskDescription || "None provided"}

Output a list of concrete checklist sub-tasks, each representing a clear physical micro-deliverable.`;

    const response = await ai!.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING, description: "Brief high-level execution approach" },
            suggested_checklist: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Sequence of micro-deliverable checklist items"
            },
            estimated_minutes: { type: Type.INTEGER, description: "Total recommended execution time in minutes" }
          },
          required: ["explanation", "suggested_checklist", "estimated_minutes"]
        }
      }
    });

    const parsedResponse = JSON.parse(response.text || "{}");
    logAiOperation("break_down", true, Date.now() - startTime);
    res.json(parsedResponse);
  } catch (err: any) {
    logAiOperation("break_down", false, Date.now() - startTime, err.message);
    res.status(500).json({ error: "AI_GENERATION_FAILED", message: err.message });
  }
});

// ============================================================================
// 4. "I'M BLOCKED" ENDPOINT
// ============================================================================
app.post("/api/ai/blocked", async (req, res) => {
  const startTime = Date.now();
  if (!ensureGeminiClient(res)) return;

  try {
    const { task, blockerReason } = req.body;
    if (!task) {
      return res.status(400).json({ error: "Missing active task." });
    }

    const systemInstruction = 
      "You are NICK OS AI BRAIN, the high-performance unblocking engine.\n" +
      "Nick is blocked on an execution task. Formulate a highly targeted, realistic unblocking protocol including a micro-start step, decisions to make, or options to pick.";

    const prompt = `Active Task: ${task.title}
Blocker Details: ${blockerReason || "Don't know where to start"}

Provide structured instructions to unblock immediately.`;

    const response = await ai!.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            assessment: { type: Type.STRING, description: "Brief diagnosis of why this block occurs" },
            first_action: { type: Type.STRING, description: "The single simplest non-intimidating 2-minute physical action to take to break inertia" },
            decisions_needed: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Clear yes/no choices or answers required to clear the block" },
            alternate_paths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Alternative ways to complete the outcome if the main path is fully blocked" }
          },
          required: ["assessment", "first_action", "decisions_needed", "alternate_paths"]
        }
      }
    });

    const parsedResponse = JSON.parse(response.text || "{}");
    logAiOperation("blocked", true, Date.now() - startTime);
    res.json(parsedResponse);
  } catch (err: any) {
    logAiOperation("blocked", false, Date.now() - startTime, err.message);
    res.status(500).json({ error: "AI_GENERATION_FAILED", message: err.message });
  }
});

// ============================================================================
// 5. "REPLAN" ENDPOINT
// ============================================================================
app.post("/api/ai/replan", async (req, res) => {
  const startTime = Date.now();
  if (!ensureGeminiClient(res)) return;

  try {
    const { context, currentTime } = req.body;
    if (!context) {
      return res.status(400).json({ error: "Missing current program context." });
    }

    const systemInstruction = 
      "You are NICK OS AI BRAIN, a dynamic real-time scheduling coordinator.\n" +
      "Nick's afternoon/remaining schedule has slipped, or he requested a replan.\n" +
      "Create an optimized schedule for the REMAINING time blocks today, considering remaining incomplete tasks and available hours.\n" +
      "Do NOT alter completed work. Return a dynamic replanned program proposal.";

    const prompt = `Current Time: ${currentTime || "14:00"}
Current Day Plan & Commitments:
${JSON.stringify(context, null, 2)}

Formulate a replanned schedule proposal for the rest of the day.`;

    const response = await ai!.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING, description: "Brief rationale of the adjustments made to accommodate delays or slips" },
            suggested_time_blocks: {
              type: Type.ARRAY,
              description: "Replanned schedule program for the remainder of today",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Time block title" },
                  blockType: { type: Type.STRING },
                  startTime: { type: Type.STRING },
                  endTime: { type: Type.STRING },
                  taskId: { type: Type.STRING }
                },
                required: ["title", "blockType", "startTime", "endTime"]
              }
            }
          },
          required: ["explanation", "suggested_time_blocks"]
        }
      }
    });

    const parsedResponse = JSON.parse(response.text || "{}");
    logAiOperation("replan", true, Date.now() - startTime);
    res.json(parsedResponse);
  } catch (err: any) {
    logAiOperation("replan", false, Date.now() - startTime, err.message);
    res.status(500).json({ error: "AI_GENERATION_FAILED", message: err.message });
  }
});


// ============================================================================
// 6. NOTIFICATION ENGINE ENDPOINTS
// ============================================================================
app.get("/api/notifications/preferences", (req, res) => {
  res.json(ServerNotificationEngine.getPreferences());
});

app.get("/api/notifications/devices", (req, res) => {
  res.json(ServerNotificationEngine.getDevices());
});

app.post("/api/notifications/preferences", (req, res) => {
  const updated = ServerNotificationEngine.updatePreferences(req.body);
  res.json(updated);
});

app.post("/api/notifications/register-device", (req, res) => {
  const registered = ServerNotificationEngine.registerDevice(req.body);
  res.json(registered);
});

app.post("/api/notifications/remove-device", (req, res) => {
  const success = ServerNotificationEngine.removeDevice(req.body.endpoint);
  res.json({ success });
});

app.get("/api/notifications/list", (req, res) => {
  res.json(ServerNotificationEngine.getNotifications());
});

app.post("/api/notifications/create", (req, res) => {
  const notif = ServerNotificationEngine.createNotification(req.body);
  res.json(notif);
});

app.post("/api/notifications/schedule", (req, res) => {
  const notif = ServerNotificationEngine.createNotification(req.body);
  res.json(notif);
});

app.post("/api/notifications/cancel/:id", (req, res) => {
  const id = req.params.id;
  const list = ServerNotificationEngine.getNotifications();
  const found = list.find(n => n.id === id);
  if (found) {
    found.status = "cancelled";
    found.updatedAt = new Date().toISOString();
  }
  res.json({ success: true });
});

app.post("/api/notifications/read/:id", (req, res) => {
  const id = req.params.id;
  const list = ServerNotificationEngine.getNotifications();
  const found = list.find(n => n.id === id);
  if (found) {
    found.status = "read";
    found.readAt = new Date().toISOString();
    found.updatedAt = new Date().toISOString();
  }
  res.json({ success: true });
});

app.post("/api/notifications/mark-all-read", (req, res) => {
  const list = ServerNotificationEngine.getNotifications();
  const nowStr = new Date().toISOString();
  list.forEach(n => {
    if (n.status !== "read") {
      n.status = "read";
      n.readAt = nowStr;
      n.updatedAt = nowStr;
    }
  });
  res.json({ success: true });
});

app.post("/api/notifications/trigger-event", (req, res) => {
  const { eventType, payload } = req.body;
  const notif = ServerNotificationEngine.triggerEvent(eventType, payload);
  res.json(notif);
});

app.post("/api/notifications/sync-scheduler", (req, res) => {
  const { timeBlocks, tasks, accountabilityRecords, proposals, currentTimeStr } = req.body;
  const generated = ServerNotificationEngine.runSchedulingCycle(
    timeBlocks || [],
    tasks || [],
    accountabilityRecords || [],
    proposals || [],
    currentTimeStr
  );
  res.json({ success: true, generated });
});

// ============================================================================
// FOCUS GUARD ENGINE & SYNC ENDPOINTS
// ============================================================================
let serverFocusGuardSettings = {
  enabled: true,
  mode: 'blacklist',
  allowedDomains: ['nickos.ai.studio', 'ai.studio', 'github.com', 'google.com', 'stackoverflow.com', 'docs.google.com'],
  blockedDomains: ['youtube.com', 'x.com', 'twitter.com', 'reddit.com', 'facebook.com', 'instagram.com', 'tiktok.com'],
  blockedApps: ['Discord.exe', 'Steam.exe', 'Spotify.exe', 'League of Legends.exe'],
  unknownSitePolicy: 'allow',
  updatedAt: new Date().toISOString(),
};

let serverActiveFocusSession: {
  sessionId: string | null;
  taskId: string | null;
  taskTitle: string | null;
  status: 'active' | 'paused' | 'completed' | 'abandoned' | 'disconnected';
  startTime: string | null;
  lastSyncAt: string | null;
} = {
  sessionId: null,
  taskId: null,
  taskTitle: null,
  status: 'disconnected',
  startTime: null,
  lastSyncAt: null,
};

const serverAgentHeartbeats = new Map<string, {
  clientId: string;
  clientType: 'browser_extension' | 'windows_agent';
  version: string;
  status: 'connected' | 'enforcing' | 'paused' | 'error' | 'disconnected';
  activeSessionId?: string | null;
  blockedEnforcementsCount: number;
  lastActionLog?: string;
  errorMessage?: string;
  lastHeartbeatAt: string;
}>();

app.get("/api/focus-guard/settings", (req, res) => {
  res.json(serverFocusGuardSettings);
});

app.post("/api/focus-guard/settings", (req, res) => {
  if (req.body && typeof req.body === 'object') {
    serverFocusGuardSettings = {
      ...serverFocusGuardSettings,
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
  }
  res.json({ success: true, settings: serverFocusGuardSettings });
});

app.post("/api/focus-guard/session-sync", (req, res) => {
  const { sessionId, taskId, taskTitle, status, startTime } = req.body || {};
  serverActiveFocusSession = {
    sessionId: sessionId || null,
    taskId: taskId || null,
    taskTitle: taskTitle || null,
    status: status || 'disconnected',
    startTime: startTime || null,
    lastSyncAt: new Date().toISOString(),
  };
  res.json({ success: true, session: serverActiveFocusSession });
});

app.get("/api/focus-guard/active-session", (req, res) => {
  // Check session freshness
  const now = Date.now();
  const lastSyncTime = serverActiveFocusSession.lastSyncAt ? new Date(serverActiveFocusSession.lastSyncAt).getTime() : 0;
  let sessionState = serverActiveFocusSession.status;
  
  // If no sync received in 60s and session was active, mark degraded
  if (sessionState === 'active' && now - lastSyncTime > 60000) {
    sessionState = 'disconnected';
  }

  const isProtectionActive = serverFocusGuardSettings.enabled && sessionState === 'active';

  // Get active heartbeats
  const cutoff = now - 45000;
  const agentsList = Array.from(serverAgentHeartbeats.values()).map(ag => {
    const last = new Date(ag.lastHeartbeatAt).getTime();
    if (isNaN(last) || last < cutoff) {
      return { ...ag, status: 'disconnected' as const };
    }
    return ag;
  });

  res.json({
    isProtectionActive,
    sessionState,
    sessionId: serverActiveFocusSession.sessionId,
    taskId: serverActiveFocusSession.taskId,
    taskTitle: serverActiveFocusSession.taskTitle,
    startTime: serverActiveFocusSession.startTime,
    settings: serverFocusGuardSettings,
    agents: agentsList,
  });
});

app.post("/api/focus-guard/heartbeat", (req, res) => {
  const { clientId, clientType, version, status, activeSessionId, blockedEnforcementsCount, lastActionLog, errorMessage } = req.body || {};
  
  if (!clientId || !clientType) {
    return res.status(400).json({ error: "MISSING_CLIENT_PARAMS", message: "clientId and clientType are required" });
  }

  const record = {
    clientId: String(clientId),
    clientType: clientType === 'windows_agent' ? ('windows_agent' as const) : ('browser_extension' as const),
    version: String(version || '1.0.0'),
    status: (status || 'connected') as any,
    activeSessionId: activeSessionId || null,
    blockedEnforcementsCount: Number(blockedEnforcementsCount || 0),
    lastActionLog: lastActionLog ? String(lastActionLog) : undefined,
    errorMessage: errorMessage ? String(errorMessage) : undefined,
    lastHeartbeatAt: new Date().toISOString(),
  };

  serverAgentHeartbeats.set(clientId, record);
  res.json({ success: true, heartbeat: record });
});

app.get("/api/focus-guard/agents", (req, res) => {
  const cutoff = Date.now() - 45000;
  const list = Array.from(serverAgentHeartbeats.values()).map(ag => {
    const last = new Date(ag.lastHeartbeatAt).getTime();
    if (isNaN(last) || last < cutoff) {
      return { ...ag, status: 'disconnected' as const };
    }
    return ag;
  });
  res.json({ agents: list });
});

// ============================================================================
// PRODUCTION HEALTH & OBSERVABILITY ENDPOINT
// ============================================================================
app.get("/api/health", (req, res) => {
  const mem = process.memoryUsage();
  const summary = ObservabilityService.getMetricsSummary();
  const jobLogs = BackgroundJobEngine.getJobLogs(5);

  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0-foundation",
    memory: {
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
    },
    ai: {
      configured: !!apiKey,
      modelPrimary: "gemini-2.5-flash",
      reasoningModel: "gemini-2.5-flash",
    },
    notifications: {
      queueCount: ServerNotificationEngine.getNotifications().length,
      deviceCount: ServerNotificationEngine.getDevices().length,
    },
    telemetry: summary,
    backgroundJobs: {
      recentExecutions: jobLogs,
    },
  });
});

// ============================================================================
// BACKGROUND SCHEDULED TASK (CRON) ENDPOINTS
// Protected via CRON_SECRET header or Bearer authorization
// ============================================================================
function verifyCronSecret(req: express.Request, res: express.Response, next: express.NextFunction) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = req.headers["x-cron-secret"] || req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (provided !== secret) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Invalid or missing cron secret." });
    }
  }
  next();
}

app.post("/api/cron/stale-sessions", verifyCronSecret, (req, res) => {
  const { sessions } = req.body || {};
  const result = BackgroundJobEngine.recoverStaleSessions(sessions || []);
  res.json({ success: true, ...result });
});

app.post("/api/cron/notifications", verifyCronSecret, (req, res) => {
  const { timeBlocks, tasks, accountabilityRecords, proposals } = req.body || {};
  const result = BackgroundJobEngine.runNotificationCycle(
    timeBlocks || [],
    tasks || [],
    accountabilityRecords || [],
    proposals || []
  );
  res.json({ success: true, ...result });
});

app.post("/api/cron/daily-accountability", verifyCronSecret, (req, res) => {
  const { date, tasks, existingRecord } = req.body || {};
  const dateStr = date || new Date().toISOString().slice(0, 10);
  try {
    const result = BackgroundJobEngine.reconcileDailyAccountability(dateStr, tasks || [], existingRecord);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: "RECONCILIATION_FAILED", message: err.message });
  }
});

app.post("/api/cron/cleanup", verifyCronSecret, (req, res) => {
  const result = BackgroundJobEngine.cleanupTransientData();
  res.json({ success: true, ...result });
});

app.post("/api/cron/all", verifyCronSecret, async (req, res) => {
  const { sessions, timeBlocks, tasks, accountabilityRecords, proposals } = req.body || {};
  const result = await BackgroundJobEngine.runFullCycle({
    sessions: sessions || [],
    timeBlocks: timeBlocks || [],
    tasks: tasks || [],
    accountabilityRecords: accountabilityRecords || [],
    proposals: proposals || [],
  });
  res.json({ success: true, ...result });
});

app.get("/api/cron/logs", verifyCronSecret, (req, res) => {
  const limit = parseInt(req.query.limit as string, 10) || 20;
  res.json({ logs: BackgroundJobEngine.getJobLogs(limit) });
});

// Production background recurring cycle (evaluates every 60 seconds)
setInterval(() => {
  try {
    const generated = ServerNotificationEngine.runSchedulingCycle([], [], [], []);
    if (generated.length > 0) {
      console.log(`[BACKGROUND ENGINE] Automatically triggered ${generated.length} notification(s) in background.`);
    }
  } catch (err) {
    console.error("[BACKGROUND ENGINE] Error in background recurring cycle:", err);
  }
}, 60000);


// ============================================================================
// VITE AND STATIC FILE SERVING MIDDLEWARE AND SERVER START
// ============================================================================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[NICK OS FULL-STACK SERVER] Running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start full-stack server:", err);
});
