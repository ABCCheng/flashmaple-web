export type EdgeTTSErrorCode =
  | "INVALID_TEXT"
  | "TEXT_TOO_LONG"
  | "SIGNATURE_GENERATION_FAILED"
  | "TOKEN_FETCH_FAILED"
  | "TOKEN_INVALID"
  | "SYNTH_RATE_LIMITED"
  | "SYNTH_SERVER_ERROR"
  | "SYNTH_REQUEST_FAILED"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

export class EdgeTTSError extends Error {
  constructor(
    public readonly code: EdgeTTSErrorCode,
    message: string,
    public readonly options: { retryable?: boolean; status?: number; cause?: unknown } = {},
  ) {
    super(message);
    this.name = "EdgeTTSError";
  }

  get retryable(): boolean {
    return this.options.retryable ?? false;
  }
}
