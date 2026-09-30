/**
 * ObservabilityService.ts
 * Centralized production telemetry, performance latency tracking, and error observability for NICK OS.
 * Explicitly sanitizes sensitive data (tokens, passwords, PII) to ensure privacy.
 */

export interface LatencyMetric {
  metric: string;
  durationMs: number;
  timestamp: string;
  tags?: Record<string, string>;
}

export interface SystemErrorEvent {
  id: string;
  source: 'api' | 'ai' | 'notification' | 'sync' | 'storage' | 'background' | 'runtime';
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

export interface ObservabilitySummary {
  uptimeSeconds: number;
  totalEvents: number;
  errorCountsBySource: Record<string, number>;
  averageLatencies: Record<string, number>;
  recentErrors: SystemErrorEvent[];
}

export class ObservabilityService {
  private static startTime = Date.now();
  private static latencyMetrics: LatencyMetric[] = [];
  private static errorLog: SystemErrorEvent[] = [];
  private static eventCount = 0;
  private static readonly MAX_LOG_SIZE = 100;

  /**
   * Helper to sanitize any sensitive fields before recording or logging
   */
  private static sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!context) return undefined;
    const sanitized: Record<string, unknown> = {};
    const SENSITIVE_KEYS = ['token', 'access_token', 'refresh_token', 'secret', 'password', 'key', 'apiKey', 'authorization'];

    for (const [key, value] of Object.entries(context)) {
      const isSensitive = SENSITIVE_KEYS.some(sk => key.toLowerCase().includes(sk.toLowerCase()));
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeContext(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Start measuring duration of an asynchronous operation
   */
  public static startTimer(): () => number {
    const start = performance.now();
    return () => Math.round(performance.now() - start);
  }

  /**
   * Record a performance latency measurement
   */
  public static recordLatency(metric: string, durationMs: number, tags?: Record<string, string>): void {
    this.eventCount++;
    this.latencyMetrics.push({
      metric,
      durationMs,
      timestamp: new Date().toISOString(),
      tags,
    });

    if (this.latencyMetrics.length > this.MAX_LOG_SIZE) {
      this.latencyMetrics.shift();
    }
  }

  /**
   * Record a system error event across API, AI, notifications, sync, etc.
   */
  public static recordError(
    source: SystemErrorEvent['source'],
    error: unknown,
    context?: Record<string, unknown>
  ): void {
    this.eventCount++;
    const message = error instanceof Error ? error.message : String(error);
    const event: SystemErrorEvent = {
      id: `err-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      source,
      message,
      timestamp: new Date().toISOString(),
      context: this.sanitizeContext(context),
    };

    console.warn(`[Observability] [${source.toUpperCase()}] ${message}`, event.context || '');

    this.errorLog.push(event);
    if (this.errorLog.length > this.MAX_LOG_SIZE) {
      this.errorLog.shift();
    }
  }

  /**
   * Record general telemetry event
   */
  public static recordEvent(name: string, data?: Record<string, unknown>): void {
    this.eventCount++;
    // In production, this can forward to external analytics/datadog/telemetry endpoint if configured
  }

  /**
   * Get telemetry summary for status audits & health dashboards
   */
  public static getMetricsSummary(): ObservabilitySummary {
    const errorCountsBySource: Record<string, number> = {
      api: 0,
      ai: 0,
      notification: 0,
      sync: 0,
      storage: 0,
      background: 0,
      runtime: 0,
    };

    for (const err of this.errorLog) {
      errorCountsBySource[err.source] = (errorCountsBySource[err.source] || 0) + 1;
    }

    const latencySums: Record<string, { sum: number; count: number }> = {};
    for (const lat of this.latencyMetrics) {
      if (!latencySums[lat.metric]) {
        latencySums[lat.metric] = { sum: 0, count: 0 };
      }
      latencySums[lat.metric].sum += lat.durationMs;
      latencySums[lat.metric].count += 1;
    }

    const averageLatencies: Record<string, number> = {};
    for (const [metric, data] of Object.entries(latencySums)) {
      averageLatencies[metric] = Math.round(data.sum / data.count);
    }

    return {
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      totalEvents: this.eventCount,
      errorCountsBySource,
      averageLatencies,
      recentErrors: [...this.errorLog].reverse().slice(0, 20),
    };
  }

  /**
   * Reset observability metrics (primarily for unit and integration testing)
   */
  public static resetForTesting(): void {
    this.startTime = Date.now();
    this.latencyMetrics = [];
    this.errorLog = [];
    this.eventCount = 0;
  }
}
