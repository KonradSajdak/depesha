export class DepeshaError extends Error {
  readonly cause: unknown

  constructor({ message, cause }: { message?: string; cause?: unknown }) {
    super(message)
    this.name = "DepeshaError"
    this.cause = cause
  }
}
