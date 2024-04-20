export class DepeshaException extends Error {}

export class ChannelClosedAlreadyException extends DepeshaException {}
export class ChannelWasClosedException extends DepeshaException {}

export class PullingTimeoutException extends DepeshaException {
  public constructor(public readonly timeout: number) {
    super(`Pulling timeout of ${timeout}ms exceeded.`)
  }
}