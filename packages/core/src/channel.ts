import { BroadcastStream } from "./broadcast-stream"
import {
  AsyncStreamProducer,
  Stream,
  StreamConsumer,
  StreamOptions,
  SyncStreamProducer,
} from "./stream"

export interface ChannelMessageOptions {
  partition?: number
}

export interface ChannelConsumerOptions {
  groupId?: string
}

export type ChannelOptions = StreamOptions

export class Channel<T>
  implements SyncStreamProducer<T>, AsyncStreamProducer<T>
{
  private readonly autoCommit?: boolean

  private readonly partitions: BroadcastStream<T>[] = []
  private readonly groups: Map<PropertyKey, Stream<T>[]> = new Map()

  public constructor(options?: ChannelOptions) {
    this.autoCommit = options?.autoCommit
  }

  public async push(value: T, options?: ChannelMessageOptions): Promise<T> {
    const partitionNumber = options?.partition ?? 1
    const partitionIndex = partitionNumber - 1

    if (this.partitions[partitionIndex] === undefined) {
      this.partitions[partitionIndex] = new BroadcastStream<T>({
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

    this.rebalanceGroup(groupId)

    return stream
  }

  private rebalance() {
    this.groups.forEach((_, groupId) => this.rebalanceGroup(groupId))
  }

  private rebalanceGroup(groupId: PropertyKey) {
    const group = this.groups.get(groupId) ?? []

    this.partitions.forEach(partition =>
      group.forEach(consumer => partition.unpipe(consumer)),
    )

    const totalPartitions = this.partitions.length
    const totalConsumers = group.length

    if (totalPartitions === 0 || totalConsumers === 0) {
      return
    }

    const average = Math.floor(totalPartitions / totalConsumers)
    const remainder = totalPartitions % totalConsumers

    for (let i = 0; i < totalConsumers; i++) {
      const start = i * average + Math.min(i, remainder)
      const end = start + average + (i + 1 <= remainder ? 1 : 0)

      const partitions = this.partitions.slice(start, end)
      const consumer = group[i]

      partitions.forEach(partition => partition.pipe(consumer))
    }
  }

  public async close() {
    await Promise.allSettled([
      ...this.partitions.map(partition => partition.close()),
      ...Array.from(this.groups.values())
        .flat()
        .map(consumer => consumer.close()),
    ])

    this.partitions.length = 0
    this.groups.clear()
  }

  public inspect() {
    return {
      partitions: this.partitions.length,
      consumers: Array.from(this.groups.values()).flat().length,
      consumerGroups: this.groups.size,
    }
  }
}
