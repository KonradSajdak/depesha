import { AsyncStreamProducer, Pending, Stream, StreamConsumer, StreamProducer, SyncStreamProducer, UnpipeCallback } from "../stream";
import { Logger } from "./logger";

export interface LogStreamOptions {
  logger: Logger
  id: string
}

export class LogStream<T>
  implements SyncStreamProducer<T>, AsyncStreamProducer<T>, StreamConsumer<T>
{
  private readonly id: string
  private readonly logger: Logger

  private pipes: Map<StreamProducer<T>, UnpipeCallback> = new Map()

  public constructor(
    private readonly stream: Stream<T>,
    options?: Partial<LogStreamOptions>,
  ) {
    this.id = options?.id || Math.random().toString(36).slice(2).toUpperCase()
    this.logger = options?.logger || console
  }

  public async push(value: T): Promise<T> {
    this.logger.log(`[${this.id}] pushing: ${value}`)
    const message = await this.stream.push(value)

    this.logger.log(`[${this.id}] pushed: ${value} (consumed)`)
    return message
  }

  public async pull(): Promise<Pending<T>> {
    this.logger.log(`[${this.id}] pull`)
    const message = await this.stream.pull()

    this.logger.log(`[${this.id}] pulled: ${message.value}`)
    return message
  }

  public pipe(stream: StreamProducer<T>) {
    this.logger.log(`[${this.id}] pipe to ${stream.constructor.name}`);

    let unsubscribed = false

    const waitForMessage = async () => {
      while (!this.stream.isClosed() && !unsubscribed) {
        this.logger.log(`[${this.id}] (pipe) waiting for message`)
        const message = await this.pull()

        this.logger.log(`[${this.id}] (pipe) received message: ${message.value}`)
        this.logger.log(`[${this.id}] (pipe) pushing message to ${stream.constructor.name}`)

        await stream
          .push(message.value)
          .then(() => message.commit())
          .catch(reason => message.reject(reason))

        this.logger.log(`[${this.id}] (pipe) pushed message to ${stream.constructor.name}`)
      }
    }

    this.pipes.set(stream, () => {
      unsubscribed = true
      this.pipes.delete(stream)
    })

    waitForMessage()

    return stream
  }

  public unpipe(stream: StreamProducer<T>) {
    this.logger.log(`[${this.id}] unpipe from ${stream.constructor.name}`)
    const unsubscribe = this.pipes.get(stream)
    if (unsubscribe) {
      unsubscribe()
    }
  }

  public unpipeAll() {
    this.logger.log(`[${this.id}] unpipe all`)
    this.pipes.forEach(unsubscribe => unsubscribe())
  }

  public getId() {
    return this.id
  }

  public async close() {
    this.logger.log(`[${this.id}] close`)
    await this.stream.close()
  }
}