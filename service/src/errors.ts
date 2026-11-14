/** An error the API can safely show to the caller. */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const insufficientBalance = (balance: number, needed: number) =>
  new AppError(409, "INSUFFICIENT_BALANCE", "Not enough points", { balance, needed });

export const keyReused = (key: string) =>
  new AppError(409, "IDEMPOTENCY_KEY_REUSED", "This eventId was already used with different details", { key });

export const alreadyRefunded = (orderId: string) =>
  new AppError(409, "ALREADY_REFUNDED", "This order was already refunded", { orderId });

export const chainUnreachable = () =>
  new AppError(503, "CHAIN_UNREACHABLE", "The chain could not be reached, so nothing could be compared");
