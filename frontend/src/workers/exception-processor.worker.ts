/**
 * Web Worker for exception processing and aggregation
 * Handles fingerprinting, grouping, and statistical analysis
 */

export interface ExceptionProcessorMessage {
  type: 'AGGREGATE_EXCEPTIONS' | 'ANALYZE_TRENDS' | 'FINGERPRINT_EXCEPTION';
  data: any;
  id: string;
}

export interface ExceptionProcessorResponse {
  type: 'AGGREGATION_COMPLETE' | 'TRENDS_COMPLETE' | 'FINGERPRINT_COMPLETE' | 'ERROR';
  data: any;
  id: string;
  error?: string;
}

interface RawException {
  type: string;
  message: string;
  stackTrace?: string[];
  timestamp: string;
  severity?: string;
  context?: Record<string, any>;
}

interface AggregatedException {
  id: string;
  type: string;
  message: string;
  fingerprint: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  severity: string;
  stackTrace: string[];
  occurrences: Array<{
    timestamp: string;
    context?: Record<string, any>;
  }>;
}

// Generate fingerprint for exception grouping
function generateFingerprint(exception: RawException): string {
  // Normalize message (remove variable parts)
  const normalizedMessage = exception.message
    .replace(/\d+/g, 'N')
    .replace(/[a-f0-9-]{36}/gi, 'UUID')
    .replace(/[a-f0-9]{24}/gi, 'ID')
    .replace(/"[^"]*"/g, '"STRING"')
    .replace(/\b(0x)?[0-9a-f]{8,16}\b/gi, 'ADDR')
    .trim();

  // Combine type and normalized message for fingerprint
  const fingerprintSource = `${exception.type}:${normalizedMessage}`;

  // Use simple hash function (crypto not available in worker, use custom)
  return simpleHash(fingerprintSource);
}

// Simple hash function for fingerprinting
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Aggregate exceptions by fingerprint
function aggregateExceptions(exceptions: RawException[]): AggregatedException[] {
  const groups = new Map<string, AggregatedException>();

  for (const exception of exceptions) {
    const fingerprint = generateFingerprint(exception);
    const existing = groups.get(fingerprint);

    if (existing) {
      // Update existing group
      existing.count++;
      existing.lastSeen = exception.timestamp;
      existing.occurrences.push({
        timestamp: exception.timestamp,
        context: exception.context,
      });

      // Update severity to highest
      if (compareSeverity(exception.severity || 'ERROR', existing.severity) > 0) {
        existing.severity = exception.severity || 'ERROR';
      }
    } else {
      // Create new group
      groups.set(fingerprint, {
        id: fingerprint,
        type: exception.type,
        message: exception.message,
        fingerprint,
        count: 1,
        firstSeen: exception.timestamp,
        lastSeen: exception.timestamp,
        severity: exception.severity || 'ERROR',
        stackTrace: exception.stackTrace || [],
        occurrences: [
          {
            timestamp: exception.timestamp,
            context: exception.context,
          },
        ],
      });
    }
  }

  // Convert to array and sort by count (most frequent first)
  return Array.from(groups.values()).sort((a, b) => b.count - a.count);
}

// Compare severity levels
function compareSeverity(a: string, b: string): number {
  const levels = { TRACE: 0, DEBUG: 1, INFO: 2, WARN: 3, ERROR: 4, FATAL: 5 };
  return (levels[a as keyof typeof levels] || 4) - (levels[b as keyof typeof levels] || 4);
}

// Analyze exception trends over time
function analyzeTrends(exceptions: RawException[]): {
  hourlyDistribution: Record<string, number>;
  dailyDistribution: Record<string, number>;
  typeDistribution: Record<string, number>;
  severityDistribution: Record<string, number>;
  topExceptions: Array<{ type: string; message: string; count: number }>;
  growthRate: {
    lastHour: number;
    last24Hours: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
} {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const hourlyDistribution: Record<string, number> = {};
  const dailyDistribution: Record<string, number> = {};
  const typeDistribution: Record<string, number> = {};
  const severityDistribution: Record<string, number> = {};
  const exceptionCounts = new Map<string, number>();

  let lastHourCount = 0;
  let last24HoursCount = 0;
  let previous24HoursCount = 0;

  for (const exception of exceptions) {
    const timestamp = new Date(exception.timestamp);

    // Hourly distribution
    const hour = timestamp.getHours();
    const hourKey = `${hour.toString().padStart(2, '0')}:00`;
    hourlyDistribution[hourKey] = (hourlyDistribution[hourKey] || 0) + 1;

    // Daily distribution
    const date = timestamp.toISOString().split('T')[0];
    dailyDistribution[date] = (dailyDistribution[date] || 0) + 1;

    // Type distribution
    typeDistribution[exception.type] = (typeDistribution[exception.type] || 0) + 1;

    // Severity distribution
    const severity = exception.severity || 'ERROR';
    severityDistribution[severity] = (severityDistribution[severity] || 0) + 1;

    // Exception counts for top exceptions
    const key = `${exception.type}:${exception.message}`;
    exceptionCounts.set(key, (exceptionCounts.get(key) || 0) + 1);

    // Growth rate calculation
    if (timestamp >= oneHourAgo) {
      lastHourCount++;
    }
    if (timestamp >= oneDayAgo) {
      last24HoursCount++;
    }
    if (timestamp >= twoDaysAgo && timestamp < oneDayAgo) {
      previous24HoursCount++;
    }
  }

  // Top exceptions
  const topExceptions = Array.from(exceptionCounts.entries())
    .map(([key, count]) => {
      const [type, message] = key.split(':');
      return { type, message, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Calculate trend
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (last24HoursCount > previous24HoursCount * 1.2) {
    trend = 'increasing';
  } else if (last24HoursCount < previous24HoursCount * 0.8) {
    trend = 'decreasing';
  }

  return {
    hourlyDistribution,
    dailyDistribution,
    typeDistribution,
    severityDistribution,
    topExceptions,
    growthRate: {
      lastHour: lastHourCount,
      last24Hours: last24HoursCount,
      trend,
    },
  };
}

// Worker message handler
self.addEventListener('message', (event: MessageEvent<ExceptionProcessorMessage>) => {
  const { type, data, id } = event.data;

  try {
    let result: any;

    switch (type) {
      case 'AGGREGATE_EXCEPTIONS':
        result = aggregateExceptions(data.exceptions);
        self.postMessage({
          type: 'AGGREGATION_COMPLETE',
          data: result,
          id,
        } as ExceptionProcessorResponse);
        break;

      case 'ANALYZE_TRENDS':
        result = analyzeTrends(data.exceptions);
        self.postMessage({
          type: 'TRENDS_COMPLETE',
          data: result,
          id,
        } as ExceptionProcessorResponse);
        break;

      case 'FINGERPRINT_EXCEPTION':
        result = generateFingerprint(data.exception);
        self.postMessage({
          type: 'FINGERPRINT_COMPLETE',
          data: result,
          id,
        } as ExceptionProcessorResponse);
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      data: null,
      id,
      error: error instanceof Error ? error.message : String(error),
    } as ExceptionProcessorResponse);
  }
});

// Signal ready
self.postMessage({ type: 'AGGREGATION_COMPLETE', data: null, id: 'init' } as ExceptionProcessorResponse);
