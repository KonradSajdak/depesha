import {
  AsyncStreamProducer,
  Stream,
  StreamConsumer,
  SyncStreamProducer,
} from "./stream"

export interface ChannelConsumerOptions {
  groupId?: string
}

export interface ChannelOptions {
  autoCommit?: boolean
}

export class Channel<T>
  implements SyncStreamProducer<T>, AsyncStreamProducer<T>
{
  private readonly autoCommit?: boolean

  private readonly buffer: T[] = []
  private readonly consumers: Stream<T>[] = []
  private readonly consumerGroups: Map<PropertyKey, number> = new Map()

  public constructor(options?: ChannelOptions) {
    this.autoCommit = options?.autoCommit
  }

  public async push(value: T): Promise<T> {
    if (this.consumers.length === 0) {
      this.buffer.push(value)
      return Promise.resolve(value)
    }

    await Promise.all(this.consumers.map(consumer => consumer.push(value)))
    return Promise.resolve(value)
  }

  public consume(options?: ChannelConsumerOptions): StreamConsumer<T> {
    if (options?.groupId) {
      const groupConsumerIndex = this.consumerGroups.get(options.groupId)
      if (groupConsumerIndex !== undefined) {
        return this.consumers[groupConsumerIndex]
      }
    }

    const consumer = new Stream<T>({ autoCommit: this.autoCommit })
    const consumersTotal = this.consumers.push(consumer)

    if (options?.groupId) {
      this.consumerGroups.set(options.groupId, consumersTotal - 1)
    }

    this.buffer.forEach(message => this.push(message))
    this.buffer.length = 0

    return consumer
  }

  public async close() {
    this.buffer.length = 0
    await Promise.allSettled(this.consumers.map(consumer => consumer.close()))
    this.consumers.length = 0
    this.consumerGroups.clear()
  }

  public inspect() {
    return {
      buffer: this.buffer.length,
      consumers: this.consumers.length,
      consumerGroups: this.consumerGroups.size,
    }
  }
}
