import { Deferred } from "./deferred"
import {
  ChannelClosedAlreadyException,
  ChannelWasClosedException,
} from "./exception"
import { Stream, StreamConsumer, StreamProducer } from "./stream"

export interface BroadcastStreamConsumerOptions {
  fromBeginning?: boolean
}

export class BroadcastStream<T> implements StreamProducer<T> {
  private readonly history: T[] = []
  private readonly consumers: Stream<T>[] = []
  private readonly buffer: { defer: Deferred<T>; value: T }[] = []

  public async push(value: T): Promise<T> {
    this.history.push(value)

    if (this.consumers.length === 0) {
      const deferred = new Deferred<T>()
      this.buffer.push({ defer: deferred, value })
      return deferred.promise
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

  public consume(options?: BroadcastStreamConsumerOptions): StreamConsumer<T> {
    const consumer = new Stream<T>()

    if (this.consumers.length === 0) {
      this.buffer.forEach(deferred => {
        const { defer, value } = deferred
        consumer.push(value).then(() => defer.resolve(deferred.value))
      })

      this.buffer.length = 0
    }

    if (this.consumers.length !== 0 && options?.fromBeginning === true) {
      this.history.forEach(message => {
        consumer.push(message)
      })
    }

    this.consumers.push(consumer)
    return consumer
  }

  public async close() {
    await Promise.allSettled(this.consumers.map(consumer => consumer.close()))
    this.history.length = 0
    this.consumers.length = 0
  }

  public inspect() {
    return {
      buffer: this.history.length,
      consumers: this.consumers.length,
    }
  }
}
