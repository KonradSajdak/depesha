// import { ConsumerGroup } from "./consumer-group"
import { Stream as ConsumerGroup } from "./stream"
import {
  AsyncStreamProducer,
  Stream,
  StreamConsumer,
  SyncStreamProducer,
} from "./stream"

export interface ChannelConsumerOptions {
  groupId?: string
}

export interface ChannelProducingOptions {
  partition?: number
}

export interface ChannelOptions {
  autoCommit?: boolean
}

export class Broadcaster<T>
  implements SyncStreamProducer<T>, AsyncStreamProducer<T>
{
  private readonly autoCommit?: boolean

  private readonly buffer: T[] = []
  private readonly consumers: Stream<T>[] = []

  public constructor(options?: ChannelOptions) {
    this.autoCommit = options?.autoCommit
  }

  public async push(value: T, options?: ChannelProducingOptions): Promise<T> {
    if (this.consumers.length === 0) {
      this.buffer.push(value)
      return Promise.resolve(value)
    }

    await Promise.all(this.consumers.map(consumer => consumer.push(value)))
    return Promise.resolve(value)
  }

  public consume(): StreamConsumer<T> {
    const consumer = new Stream<T>({ autoCommit: this.autoCommit })
    this.consumers.push(consumer)

    this.buffer.forEach(message => this.push(message))
    this.buffer.length = 0

    return consumer
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
