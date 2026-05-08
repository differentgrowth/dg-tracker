import { GscApiError } from "@/lib/integrations/gsc/errors";

const SENSITIVE_ERROR_PATTERN =
  /access[_-]?token|refresh[_-]?token|id[_-]?token|authorization|client[_-]?secret|cipher|password|secret|token=/i;

export interface RedactedError {
  code?: string;
  message: string;
  name: string;
  retryable?: boolean;
  status?: number;
}

function scrubMessage(message: string): string {
  if (SENSITIVE_ERROR_PATTERN.test(message)) {
    return "Redacted sensitive error message";
  }

  return message.slice(0, 300);
}

/**
 * Produces a small, log-safe error shape. Never pass raw provider payloads,
 * headers, OAuth codes, or token/ciphertext strings to logs.
 */
export function redactError(error: unknown): RedactedError {
  if (error instanceof GscApiError) {
    return {
      name: error.name,
      message: scrubMessage(error.message),
      status: error.status,
      code: error.code,
      retryable: error.retryable,
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: scrubMessage(error.message),
    };
  }

  return {
    name: "UnknownError",
    message: "Unknown error",
  };
}
