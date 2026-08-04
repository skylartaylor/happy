const REDACTED = '[REDACTED]';

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  return normalized === 'authorization'
    || normalized === 'proxyauthorization'
    || normalized === 'cookie'
    || normalized === 'setcookie'
    || /(?:token|secret|password|privatekey|encryptionkey|apikey|accesskey|sessionkey|credential)$/.test(normalized);
}

function redactSensitiveString(value: string): string {
  const secretAssignment = /((?:["']?)(?:authorization|proxy-authorization|cookie|set-cookie|[a-z0-9_-]*(?:token|secret|password|private[_-]?key|encryption[_-]?key|api[_-]?key|access[_-]?key|session[_-]?key|credential))(?:["']?)\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;}\]]+)/gi;
  return value
    .replace(/\b(Bearer|Basic)\s+[^\s,"'}\]]+/gi, '$1 [REDACTED]')
    .replace(secretAssignment, `$1${REDACTED}`);
}

export function redactSensitiveLogData(
  value: unknown,
  seen: WeakSet<object> = new WeakSet(),
  depth = 0,
): unknown {
  if (typeof value === 'string') {
    return redactSensitiveString(value);
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (depth >= 6) {
    return '[Truncated]';
  }
  if (seen.has(value)) {
    return '[Circular]';
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((entry) => redactSensitiveLogData(entry, seen, depth + 1));
  }
  if (value instanceof Date) {
    return value;
  }
  if (value instanceof RegExp) {
    return value;
  }
  if (ArrayBuffer.isView(value)) {
    return value;
  }
  if (value instanceof Map) {
    const result = new Map<unknown, unknown>();
    for (const [key, entry] of value.entries()) {
      result.set(
        key,
        typeof key === 'string' && isSensitiveKey(key)
          ? REDACTED
          : redactSensitiveLogData(entry, seen, depth + 1),
      );
    }
    return result;
  }
  if (value instanceof Set) {
    return new Set(Array.from(value, (entry) => redactSensitiveLogData(entry, seen, depth + 1)));
  }

  const result: Record<string, unknown> = {};
  if (value instanceof Error) {
    result.name = value.name;
    result.message = redactSensitiveString(value.message);
    if (value.stack) {
      result.stack = redactSensitiveString(value.stack);
    }
  }

  for (const [key, entry] of Object.entries(value)) {
    result[key] = isSensitiveKey(key)
      ? REDACTED
      : redactSensitiveLogData(entry, seen, depth + 1);
  }
  return result;
}
