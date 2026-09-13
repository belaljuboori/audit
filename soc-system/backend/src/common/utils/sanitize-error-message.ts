// Order matters: more specific patterns (that consume a trailing credential
// token) must run before broader ones, or the broad pattern can eat the
// keyword the specific pattern needed to match against (e.g. "Authorization:"
// swallowing "Bearer" before the Bearer-specific pattern gets to run).
const SENSITIVE_PATTERNS = [
  /Bearer\s+\S+/gi,
  /Authorization:\s*\S+/gi,
  /api[_-]?key["'=:\s]+\S+/gi,
  /token["'=:\s]+\S+/gi,
  /password["'=:\s]+\S+/gi,
  /secret["'=:\s]+\S+/gi,
];

/**
 * Strips anything that looks like a credential from an error message before
 * it is stored (Node.lastError, NodeHealthCheck.errorMessage) or returned by
 * an API response. Node connection errors can otherwise embed the very
 * request that failed — including an Authorization header — verbatim.
 */
export function sanitizeErrorMessage(message: string, maxLength = 1000): string {
  let sanitized = message;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized.slice(0, maxLength);
}
