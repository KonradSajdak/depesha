import { Broadcaster } from "./broadcaster"
import { ChannelOptions } from "./channel"
import {
  AsyncStreamProducer,
  Stream,
  StreamConsumer,
  SyncStreamProducer,
} from "./stream"

export interface PushingOptions {
  partition?: number
}

export interface ChannelConsumerOptions {
  groupId?: string
}

export class ConsumerGroup<T>
  implements SyncStreamProducer<T>, AsyncStreamProducer<T>
{
  private readonly autoCommit?: boolean

  private readonly partitions: Broadcaster<T>[] = []
  // private readonly consumers: StreamConsumer<T>[] = []

  private readonly consumers: Map<PropertyKey, StreamConsumer<T>[]> = new Map()
  private readonly groups: Map<PropertyKey, Stream<T>[]> = new Map()

  public constructor(options?: ChannelOptions) {
    this.autoCommit = options?.autoCommit
  }

  public async push(value: T, options?: PushingOptions): Promise<T> {
    const partitionNumber = options?.partition ?? 1
    const partitionIndex = partitionNumber - 1

    if (this.partitions[partitionIndex] === undefined) {
      this.partitions[partitionIndex] = new Broadcaster<T>({
        autoCommit: this.autoCommit,
      })

      this.rebalance()
    }

    await this.partitions[partitionIndex].push(value)
    return Promise.resolve(value)
  }

  public consume(options?: ChannelConsumerOptions): StreamConsumer<T> {
    const groupId = options?.groupId ?? Symbol()
    const group = this.groups.get(groupId) ?? []

    const stream = new Stream<T>({ autoCommit: this.autoCommit })
    group.push(stream)

    this.groups.set(groupId, group)

    this.rebalance()

    return stream
  }

  private rebalance() {
    this.consumers.forEach(partition => partition.unpipeAll())

    const totalPartitions = this.partitions.length
    const totalConsumers = this.consumers.length

    if (totalPartitions === 0 || totalConsumers === 0) {
      return
    }

    const average = Math.floor(totalPartitions / totalConsumers)
    const remainder = totalPartitions % totalConsumers

    for (let i = 0; i < totalConsumers; i++) {
      const start = i * average + Math.min(i, remainder)
      const end = start + average + (i + 1 <= remainder ? 1 : 0)

      const partitions = this.partitions.slice(start, end)
      const consumer = this.consumers[i]

      partitions.forEach(partition => partition.pipe(consumer))
    }
  }

  private rebalanceGroup(groupId: PropertyKey) {
    const group = this.groups.get(groupId) ?? []
    const totalPartitions = this.partitions.length
    const totalConsumers = group.length

    if (totalPartitions === 0 || totalConsumers === 0) {
      return
    }

    const consumers = this.partitions.map(partition => partition.consume())
    this.consumers.set(groupId, consumers)

    const average = Math.floor(totalPartitions / totalConsumers)
    const remainder = totalPartitions % totalConsumers

    for (let i = 0; i < totalConsumers; i++) {
      const start = i * average + Math.min(i, remainder)
      const end = start + average + (i + 1 <= remainder ? 1 : 0)

      const partitions = consumers.slice(start, end)
      const consumer = group[i]

      partitions.forEach(partition => partition.pipe(consumer))
    }
  }

  public async close() {
    // this.buffer.length = 0
    // await Promise.allSettled(Array.from(this.consumers.values()).map(consumer => consumer.close()))
    // this.consumers.clear()
    // this.consumerGroups.clear()
  }

  public inspect() {
    return {
      // buffer: this.buffer.length,
      // consumers: this.consumers.size,
      // consumerGroups: this.consumerGroups.size,
      buffer: 0,
      consumers: 0,
      consumerGroups: 0,
    }
  }
}
