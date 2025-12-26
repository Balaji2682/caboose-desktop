/**
 * Web Worker for heavy log processing operations
 * Handles parsing, filtering, and analyzing large log datasets
 */

export interface LogProcessorMessage {
  type: 'PARSE_LOGS' | 'FILTER_LOGS' | 'ANALYZE_PATTERNS' | 'SEARCH_LOGS';
  data: any;
  id: string;
}

export interface LogProcessorResponse {
  type: 'PARSE_COMPLETE' | 'FILTER_COMPLETE' | 'ANALYSIS_COMPLETE' | 'SEARCH_COMPLETE' | 'ERROR';
  data: any;
  id: string;
  error?: string;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  source?: string;
  metadata?: Record<string, any>;
}

// Parse raw log lines into structured entries
function parseLogs(rawLogs: string[]): LogEntry[] {
  const parsed: LogEntry[] = [];

  for (const line of rawLogs) {
    try {
      // Try JSON parsing first
      if (line.trim().startsWith('{')) {
        const entry = JSON.parse(line);
        parsed.push({
          timestamp: entry.timestamp || entry.time || new Date().toISOString(),
          level: entry.level || entry.severity || 'INFO',
          message: entry.message || entry.msg || line,
          source: entry.source || entry.logger,
          metadata: entry,
        });
        continue;
      }

      // Parse structured logs (common formats)
      const timestampRegex = /(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)/;
      const levelRegex = /(DEBUG|INFO|WARN|WARNING|ERROR|FATAL|TRACE)/i;

      const timestampMatch = line.match(timestampRegex);
      const levelMatch = line.match(levelRegex);

      parsed.push({
        timestamp: timestampMatch ? timestampMatch[1] : new Date().toISOString(),
        level: levelMatch ? levelMatch[1].toUpperCase() : 'INFO',
        message: line,
        metadata: {},
      });
    } catch (error) {
      // Fallback for unparseable logs
      parsed.push({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: line,
        metadata: {},
      });
    }
  }

  return parsed;
}

// Filter logs based on criteria
function filterLogs(
  logs: LogEntry[],
  filters: {
    levels?: string[];
    search?: string;
    startTime?: string;
    endTime?: string;
    source?: string;
  }
): LogEntry[] {
  return logs.filter((log) => {
    // Level filter
    if (filters.levels && filters.levels.length > 0) {
      if (!filters.levels.includes(log.level)) {
        return false;
      }
    }

    // Search filter (case-insensitive)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!log.message.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // Time range filter
    if (filters.startTime) {
      if (new Date(log.timestamp) < new Date(filters.startTime)) {
        return false;
      }
    }

    if (filters.endTime) {
      if (new Date(log.timestamp) > new Date(filters.endTime)) {
        return false;
      }
    }

    // Source filter
    if (filters.source && log.source !== filters.source) {
      return false;
    }

    return true;
  });
}

// Analyze log patterns and statistics
function analyzePatterns(logs: LogEntry[]) {
  const patterns = {
    levelDistribution: {} as Record<string, number>,
    topSources: {} as Record<string, number>,
    errorPatterns: [] as { pattern: string; count: number; examples: string[] }[],
    timeDistribution: {} as Record<string, number>,
    totalLogs: logs.length,
  };

  const errorMessages = new Map<string, { count: number; examples: string[] }>();

  for (const log of logs) {
    // Level distribution
    patterns.levelDistribution[log.level] = (patterns.levelDistribution[log.level] || 0) + 1;

    // Source distribution
    if (log.source) {
      patterns.topSources[log.source] = (patterns.topSources[log.source] || 0) + 1;
    }

    // Time distribution (by hour)
    const hour = new Date(log.timestamp).getHours();
    const hourKey = `${hour}:00`;
    patterns.timeDistribution[hourKey] = (patterns.timeDistribution[hourKey] || 0) + 1;

    // Error pattern detection
    if (log.level === 'ERROR' || log.level === 'FATAL') {
      // Extract error pattern (first 100 chars, remove specific values)
      const pattern = log.message
        .substring(0, 100)
        .replace(/\d+/g, 'N')
        .replace(/[a-f0-9-]{36}/gi, 'UUID')
        .replace(/[a-f0-9]{24}/gi, 'ID');

      const existing = errorMessages.get(pattern);
      if (existing) {
        existing.count++;
        if (existing.examples.length < 3) {
          existing.examples.push(log.message);
        }
      } else {
        errorMessages.set(pattern, { count: 1, examples: [log.message] });
      }
    }
  }

  // Convert error patterns to array and sort by count
  patterns.errorPatterns = Array.from(errorMessages.entries())
    .map(([pattern, data]) => ({
      pattern,
      count: data.count,
      examples: data.examples,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 patterns

  return patterns;
}

// Search logs with regex support
function searchLogs(logs: LogEntry[], query: string, useRegex: boolean = false): LogEntry[] {
  if (!query) return logs;

  try {
    if (useRegex) {
      const regex = new RegExp(query, 'i');
      return logs.filter((log) => regex.test(log.message));
    } else {
      const queryLower = query.toLowerCase();
      return logs.filter((log) => log.message.toLowerCase().includes(queryLower));
    }
  } catch (error) {
    // Invalid regex, fall back to plain text search
    const queryLower = query.toLowerCase();
    return logs.filter((log) => log.message.toLowerCase().includes(queryLower));
  }
}

// Worker message handler
self.addEventListener('message', (event: MessageEvent<LogProcessorMessage>) => {
  const { type, data, id } = event.data;

  try {
    let result: any;

    switch (type) {
      case 'PARSE_LOGS':
        result = parseLogs(data.rawLogs);
        self.postMessage({
          type: 'PARSE_COMPLETE',
          data: result,
          id,
        } as LogProcessorResponse);
        break;

      case 'FILTER_LOGS':
        result = filterLogs(data.logs, data.filters);
        self.postMessage({
          type: 'FILTER_COMPLETE',
          data: result,
          id,
        } as LogProcessorResponse);
        break;

      case 'ANALYZE_PATTERNS':
        result = analyzePatterns(data.logs);
        self.postMessage({
          type: 'ANALYSIS_COMPLETE',
          data: result,
          id,
        } as LogProcessorResponse);
        break;

      case 'SEARCH_LOGS':
        result = searchLogs(data.logs, data.query, data.useRegex);
        self.postMessage({
          type: 'SEARCH_COMPLETE',
          data: result,
          id,
        } as LogProcessorResponse);
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
    } as LogProcessorResponse);
  }
});

// Signal ready
self.postMessage({ type: 'PARSE_COMPLETE', data: null, id: 'init' } as LogProcessorResponse);
