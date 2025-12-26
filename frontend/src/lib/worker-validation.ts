/**
 * Security validation for Web Worker messages
 */

export interface WorkerMessage {
  type: string;
  data: any;
  id: string;
}

// Allowed message types per worker
const allowedMessageTypes: Record<string, Set<string>> = {
  'log-processor': new Set(['PARSE_LOGS', 'FILTER_LOGS', 'ANALYZE_PATTERNS', 'SEARCH_LOGS']),
  'query-analyzer': new Set(['ANALYZE_EXPLAIN', 'DETECT_PATTERNS', 'GENERATE_RECOMMENDATIONS']),
  'exception-processor': new Set(['AGGREGATE_EXCEPTIONS', 'ANALYZE_TRENDS', 'FINGERPRINT_EXCEPTION']),
};

/**
 * Validates a worker message before processing
 */
export function validateWorkerMessage(
  workerType: string,
  message: any
): { valid: boolean; error?: string } {
  // Check message structure
  if (!message || typeof message !== 'object') {
    return { valid: false, error: 'Invalid message format' };
  }

  const { type, data, id } = message;

  // Validate required fields
  if (!type || !id) {
    return { valid: false, error: 'Missing required fields (type, id)' };
  }

  // Validate type is string
  if (typeof type !== 'string') {
    return { valid: false, error: 'Type must be a string' };
  }

  // Validate type is allowed for this worker
  const allowed = allowedMessageTypes[workerType];
  if (!allowed || !allowed.has(type)) {
    return { valid: false, error: `Invalid message type: ${type}` };
  }

  // Validate data structure based on type
  const dataValidation = validateDataForType(type, data);
  if (!dataValidation.valid) {
    return dataValidation;
  }

  return { valid: true };
}

/**
 * Validates data structure for specific message types
 */
function validateDataForType(
  type: string,
  data: any
): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Data must be an object' };
  }

  switch (type) {
    case 'PARSE_LOGS':
      if (!Array.isArray(data.rawLogs)) {
        return { valid: false, error: 'rawLogs must be an array' };
      }
      break;

    case 'FILTER_LOGS':
      if (!Array.isArray(data.logs)) {
        return { valid: false, error: 'logs must be an array' };
      }
      if (data.filters && typeof data.filters !== 'object') {
        return { valid: false, error: 'filters must be an object' };
      }
      break;

    case 'ANALYZE_PATTERNS':
    case 'SEARCH_LOGS':
      if (!Array.isArray(data.logs)) {
        return { valid: false, error: 'logs must be an array' };
      }
      break;

    case 'ANALYZE_EXPLAIN':
      if (!Array.isArray(data.explainRows)) {
        return { valid: false, error: 'explainRows must be an array' };
      }
      break;

    case 'DETECT_PATTERNS':
      if (!Array.isArray(data.queries)) {
        return { valid: false, error: 'queries must be an array' };
      }
      break;

    case 'AGGREGATE_EXCEPTIONS':
    case 'ANALYZE_TRENDS':
      if (!Array.isArray(data.exceptions)) {
        return { valid: false, error: 'exceptions must be an array' };
      }
      break;

    case 'FINGERPRINT_EXCEPTION':
      if (!data.exception || typeof data.exception !== 'object') {
        return { valid: false, error: 'exception must be an object' };
      }
      break;
  }

  return { valid: true };
}

/**
 * Sanitizes data to prevent injection attacks
 */
export function sanitizeData(data: any): any {
  if (typeof data === 'string') {
    // Remove potential script tags
    return data.replace(/<script[^>]*>.*?<\/script>/gi, '');
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }

  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        sanitized[key] = sanitizeData(data[key]);
      }
    }
    return sanitized;
  }

  return data;
}
