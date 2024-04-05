import {
  AsyncStreamProducer,
  Stream,
  StreamConsumer,
  StreamPipe,
  StreamProducer,
  SyncStreamProducer,
} from "./stream"

export class BroadcastStream<T>
  implements SyncStreamProducer<T>, AsyncStreamProducer<T>, StreamPipe<T>
{
  private readonly buffer: T[] = []
  private readonly consumers: Stream<T>[] = []

  private readonly pipes: Map<StreamProducer<T>, Stream<T>> = new Map()

  public async push(value: T): Promise<T> {
    if (this.consumers.length === 0) {
      this.buffer.push(value)
      return Promise.resolve(value)
    }

    await Promise.all(this.consumers.map(consumer => consumer.push(value)))
    return Promise.resolve(value)
  }

  public consume(): StreamConsumer<T> {
    const consumer = new Stream<T>()
    this.consumers.push(consumer)

    this.buffer.forEach(message => this.push(message))
    this.buffer.length = 0

    return consumer
  }

  public pipe(producer: StreamProducer<T>): StreamProducer<T> {
    const consumer = this.consume() as Stream<T>
    this.pipes.set(producer, consumer)

    return consumer.pipe(producer)
  }

  public unpipe(producer: StreamProducer<T>): void {
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
    this.pipes.forEach((_, producer) => this.unpipe(producer))
  }

  public async close() {
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
}
