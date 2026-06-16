const MAX_DEPTH = 4;
const MAX_ARRAY_ITEMS = 20;
const MAX_STRING_LENGTH = 500;
const REDACTED_KEY_PARTS = ["authorization", "cookie", "password", "secret", "token"];

export function formatLogPayload(value: unknown): string {
  try {
    return JSON.stringify(sanitizeForLog(value, 0, new WeakSet<object>()));
  } catch {
    return "\"[unserializable payload]\"";
  }
}

function sanitizeForLog(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}... [truncated length=${value.length}]`
      : value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "symbol" || typeof value === "function") {
    return `[${typeof value}]`;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Buffer.isBuffer(value)) {
    return `[buffer length=${value.length}]`;
  }

  if (seen.has(value)) {
    return "[circular]";
  }

  seen.add(value);

  if (Array.isArray(value)) {
    if (depth >= MAX_DEPTH) {
      return `[array length=${value.length}]`;
    }

    const sample = value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitizeForLog(item, depth + 1, seen));
    return value.length > MAX_ARRAY_ITEMS ? { kind: "array", length: value.length, sample } : sample;
  }

  if (!isRecord(value)) {
    return "[unknown object]";
  }

  if (isStreamLike(value)) {
    return "[stream]";
  }

  if (depth >= MAX_DEPTH) {
    return "[object]";
  }

  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === undefined) {
      continue;
    }

    output[key] = shouldRedactKey(key) ? "[redacted]" : sanitizeForLog(entry, depth + 1, seen);
  }

  return output;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStreamLike(value: Record<string, unknown>): boolean {
  return typeof value.pipe === "function" || typeof value.on === "function";
}

function shouldRedactKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return REDACTED_KEY_PARTS.some((part) => lowerKey.includes(part));
}
