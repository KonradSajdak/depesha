import { Stream } from "../stream";
import { BroadcastStream } from "../broadcast-stream";
import { AsyncStreamProducer, StreamConsumer, StreamPipe, StreamProducer, SyncStreamProducer } from "../stream";
import { LogStream, LogStreamOptions } from "./log-stream";
import { Logger } from "./logger";

export class LogBroadcastStream<T>
  implements SyncStreamProducer<T>, AsyncStreamProducer<T>, StreamPipe<T>
{
  private readonly id: string
  private readonly logger: Logger

  public constructor(
    options?: Partial<LogStreamOptions>,
  ) {
    this.id = options?.id || Math.random().toString(36).slice(2).toUpperCase()
    this.logger = options?.logger || console
  }

  private readonly buffer: T[] = []
  private readonly consumers: LogStream<T>[] = []

  private readonly pipes: Map<StreamProducer<T>, LogStream<T>> = new Map()

  public async push(value: T): Promise<T> {
    this.logger.log(`[${this.id}] pushing: ${value}`)

    if (this.consumers.length === 0) {
      this.buffer.push(value)
      return Promise.resolve(value)
    }

    await Promise.all(
      this.consumers.map(consumer => consumer.push(value)),
    )

    this.logger.log(`[${this.id}] pushed: ${value} (consumed)`)

    return Promise.resolve(value)
  }

  public consume(): StreamConsumer<T> {
    this.logger.log(`[${this.id}] create consumer (${this.id}-${this.consumers.length})`)

    const consumer = new LogStream(new Stream<T>(), {
      id: `${this.id}-${this.consumers.length}`,
    })
    this.consumers.push(consumer)

    if (this.buffer.length !== 0) {
      this.logger.log(`[${this.id}] consume buffered messages: ${this.buffer.length}`)
    }
    this.buffer.forEach(message => this.push(message))
    this.buffer.length = 0

    return consumer
  }

  public pipe(producer: LogBroadcastStream<T>): StreamProducer<T> {
    this.logger.log(`[${this.id}] pipe to ${producer.getId()}`);

    const consumer = this.consume() as LogStream<T>
    this.pipes.set(producer, consumer)

    return consumer.pipe(producer)
  }

  public unpipe(producer: StreamProducer<T>): void {
    this.logger.log(`[${this.id}] unpipe from ${producer.constructor.name}`);

    const consumer = this.pipes.get(producer)
    if (consumer) {
      consumer.unpipe(producer)

      const consumerIndex = this.consumers.indexOf(consumer)
      if (consumerIndex !== -1) {
        this.consumers.splice(consumerIndex, 1)
      }
    }
  }

  public unpipeAll() {
    this.logger.log(`[${this.id}] unpipe all`)

    this.pipes.forEach((_, producer) => this.unpipe(producer))
  }

  public async close() {
    this.logger.log(`[${this.id}] close`)

    this.buffer.length = 0
    await Promise.allSettled(this.consumers.map(consumer => consumer.close()))
    this.consumers.length = 0
  }

  public inspect() {
    return {
      buffer: this.buffer.length,
      consumers: this.consumers.length,
    }
  }

  public getId() {
    return this.id
  }
}