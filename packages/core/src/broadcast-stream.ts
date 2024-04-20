import {
  ChannelClosedAlreadyException,
  ChannelWasClosedException,
} from "./exception"
import {
  AsyncStreamProducer,
  Stream,
  StreamConsumer,
  SyncStreamProducer,
} from "./stream"

export class BroadcastStream<T>
  implements SyncStreamProducer<T>, AsyncStreamProducer<T>
{
  private readonly buffer: T[] = []
  private readonly consumers: Stream<T>[] = []

  public async push(value: T): Promise<T> {
    if (this.consumers.length === 0) {
      this.buffer.push(value)
      return Promise.resolve(value)
    }

    return await Promise.all(
      this.consumers.map(consumer => consumer.push(value)),
    )
      .then(() => value)
      .catch(error => {
        if (error instanceof ChannelClosedAlreadyException) {
          throw new ChannelWasClosedException(error.message)
        }

        throw error
      })
  }

  public consume(): StreamConsumer<T> {
    const consumer = new Stream<T>()
    this.consumers.push(consumer)

    this.buffer.forEach(message => this.push(message))

    return consumer
  }

  public async close() {
    await Promise.allSettled(this.consumers.map(consumer => consumer.close()))
    this.buffer.length = 0
    this.consumers.length = 0
  }

  public inspect() {
    return {
      buffer: this.buffer.length,
      consumers: this.consumers.length,
    }
  }
}
