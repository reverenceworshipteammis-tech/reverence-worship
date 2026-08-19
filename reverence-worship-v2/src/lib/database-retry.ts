const TRANSIENT_DATABASE_ERRORS = [
  "connection terminated unexpectedly",
  "connection terminated",
  "connection timeout",
  "connection pool timeout",
  "connection closed",
  "server closed the connection",
  "can't reach database server",
  "timed out fetching a new connection from the connection pool",
  "too many clients already",
  "remaining connection slots are reserved",
  "econnreset",
  "etimedout",
];

const TRANSIENT_DATABASE_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "P1001",
  "P1002",
  "P1008",
  "P1017",
  "P2024",
  "P2037",
]);

function errorDetails(error: unknown) {
  const messages: string[] = [];
  const codes: string[] = [];
  let current: unknown = error;

  for (let depth = 0; current && depth < 4; depth += 1) {
    if (typeof current !== "object") {
      messages.push(String(current));
      break;
    }

    const candidate = current as { code?: unknown; message?: unknown; cause?: unknown };
    if (typeof candidate.code === "string") codes.push(candidate.code.toUpperCase());
    if (typeof candidate.message === "string") messages.push(candidate.message);
    current = candidate.cause;
  }

  return { codes, message: messages.join(" ").toLowerCase() };
}

export function isTransientDatabaseError(error: unknown) {
  const { codes, message } = errorDetails(error);
  return codes.some((code) => TRANSIENT_DATABASE_CODES.has(code))
    || TRANSIENT_DATABASE_ERRORS.some((pattern) => message.includes(pattern));
}

export async function withDatabaseRetry<T>(operation: () => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientDatabaseError(error) || attempt === attempts) throw error;
      console.warn(`Database connection dropped; retrying (${attempt}/${attempts - 1}).`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 150));
    }
  }

  throw lastError;
}
