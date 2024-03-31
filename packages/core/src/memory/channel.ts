import { ConsumerGroup } from "./consumer-group"
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

export class Channel<T>
  implements SyncStreamProducer<T>, AsyncStreamProducer<T>
{
  private readonly autoCommit?: boolean

  private readonly buffer: T[] = []
  private readonly consumers: Map<PropertyKey, ConsumerGroup<T>> = new Map()
  private readonly consumerGroups: Map<PropertyKey, number> = new Map()

  public constructor(options?: ChannelOptions) {
    this.autoCommit = options?.autoCommit
  }

  public async push(value: T, options?: ChannelProducingOptions): Promise<T> {
    if (this.consumers.size === 0) {
      this.buffer.push(value)
      return Promise.resolve(value)
    }

    await Promise.all(
      Array.from(this.consumers.values()).map(consumer =>
        consumer.push(value, options),
      ),
    )
    return Promise.resolve(value)
  }

  public consume(options?: ChannelConsumerOptions): StreamConsumer<T> {
    const groupId = options?.groupId ?? Symbol()

    if (!this.consumers.has(groupId)) {
      this.consumers.set(groupId, new ConsumerGroup<T>())
    }

    const consumerGroup = this.consumers.get(groupId)!

    this.buffer.forEach(message => this.push(message))
    this.buffer.length = 0

    return consumerGroup.consume()
  }

  public async close() {
    this.buffer.length = 0
    // await Promise.allSettled(Array.from(this.consumers.values()).map(consumer => consumer.close()))
    this.consumers.clear()
    this.consumerGroups.clear()
  }

  public inspect() {
    return {
      buffer: this.buffer.length,
      consumers: this.consumers.size,
      consumerGroups: this.consumerGroups.size,
    }
  }
}
