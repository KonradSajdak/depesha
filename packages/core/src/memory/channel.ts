import {
  AsyncStreamProducer,
  Stream,
  StreamConsumer,
  SyncStreamProducer,
} from "./stream"

export interface ChannelConsumerOptions {
  groupId?: string
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
  private readonly streams: Stream<T>[] = []
  private readonly consumerGroups: Map<PropertyKey, number> = new Map()

  public constructor(options?: ChannelOptions) {
    this.autoCommit = options?.autoCommit
  }

  public async push(value: T): Promise<T> {
    if (this.streams.length === 0) {
      this.buffer.push(value)
      return Promise.resolve(value)
    }

    await Promise.all(this.streams.map(consumer => consumer.push(value)))
    return Promise.resolve(value)
  }

  public consume(options?: ChannelConsumerOptions): StreamConsumer<T> {
    if (options?.groupId) {
      const groupConsumerIndex = this.consumerGroups.get(options.groupId)
      if (groupConsumerIndex !== undefined) {
        return this.streams[groupConsumerIndex]
      }
    }

    const stream = new Stream<T>({ autoCommit: this.autoCommit })
    const consumersTotal = this.streams.push(stream)

    if (options?.groupId) {
      this.consumerGroups.set(options.groupId, consumersTotal - 1)
    }

    this.buffer.forEach(message => this.push(message))
    this.buffer.length = 0

    return stream
  }

  public async close() {
    this.buffer.length = 0
    await Promise.allSettled(this.streams.map(consumer => consumer.close()))
    this.streams.length = 0
    this.consumerGroups.clear()
  }

  public inspect() {
    return {
      buffer: this.buffer.length,
      consumers: this.streams.length,
      consumerGroups: this.consumerGroups.size,
    }
  }
}
