/**
 * Error type for GSC API failures. Carries status code + Google error code
 * (when available) without including tokens, headers, or full payloads.
 */
export class GscApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly retryable: boolean;

  constructor(opts: {
    status: number;
    code?: string;
    message: string;
    retryable?: boolean;
  }) {
    super(opts.message);
    this.name = "GscApiError";
    this.status = opts.status;
    this.code = opts.code;
    this.retryable =
      opts.retryable ?? (opts.status === 429 || opts.status >= 500);
  }
}

export function isQuotaError(err: unknown): boolean {
  return (
    err instanceof GscApiError &&
    (err.status === 429 || err.code === "RESOURCE_EXHAUSTED")
  );
}

export function getGscSyncErrorMessage(err: unknown): string {
  if (isQuotaError(err)) {
    return "GSC quota exceeded — retry later";
  }

  if (
    err instanceof GscApiError &&
    (err.status === 401 || err.status === 403)
  ) {
    return "Google Search Console authorization failed — reconnect the property.";
  }

  if (err instanceof GscApiError && err.retryable) {
    return "Google Search Console is temporarily unavailable — retry later.";
  }

  return "GSC sync failed — check the connection and retry.";
}
