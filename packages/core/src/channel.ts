import { BroadcastStream } from "./broadcast-stream"
import { Pipe, fromBroadcastStream } from "./pipe"
import { Stream, StreamConsumer, StreamProducer } from "./stream"

export interface ChannelMessageOptions {
  partition?: number
}

export interface ChannelConsumerOptions {
  groupId?: string
}

export class Channel<T> implements StreamProducer<T> {
  private readonly partitions: BroadcastStream<T>[] = []
  private readonly groups: Map<PropertyKey, Stream<T>[]> = new Map()
  private readonly pipes: Map<PropertyKey, Pipe<T>[]> = new Map()

  public async push(value: T, options?: ChannelMessageOptions): Promise<T> {
    const partitionNumber = options?.partition ?? 1
    const partitionIndex = partitionNumber - 1

    if (this.partitions[partitionIndex] === undefined) {
      this.partitions[partitionIndex] = new BroadcastStream<T>()

      this.rebalance()
    }

    return await this.partitions[partitionIndex].push(value)
  }

  public consume(options?: ChannelConsumerOptions): StreamConsumer<T> {
    const groupId = options?.groupId ?? Symbol()
    const group = this.groups.get(groupId) ?? []

    const stream = new Stream<T>()
    group.push(stream)

    this.groups.set(groupId, group)

    this.rebalanceGroup(groupId)

    return stream
  }

  private rebalance() {
    this.groups.forEach((_, groupId) => this.rebalanceGroup(groupId))
  }

  private rebalanceGroup(groupId: PropertyKey) {
    this.detachGroupFromPartitions(groupId)

    const group = this.groups.get(groupId) ?? []

    const totalPartitions = this.partitions.length
    const totalConsumers = group.length

    if (totalPartitions === 0 || totalConsumers === 0) {
      return
    }

    const average = Math.floor(totalPartitions / totalConsumers)
    const remainder = totalPartitions % totalConsumers
    const pipes: Pipe<T>[] = []

    for (let i = 0; i < totalConsumers; i++) {
      const start = i * average + Math.min(i, remainder)
      const end = start + average + (i + 1 <= remainder ? 1 : 0)

      const partitions = this.partitions.slice(start, end)
      const consumer = group[i]

      pipes.push(
        ...partitions.map(partition =>
          fromBroadcastStream(partition).pipe(consumer),
        ),
      )
    }

    this.attachGroupToPartitions(groupId, pipes)
  }

  private detachGroupFromPartitions(groupId: PropertyKey) {
    const pipes = this.pipes.get(groupId) ?? []
    pipes.forEach(pipe => pipe.unpipeAll())
    this.pipes.delete(groupId)
  }

  private attachGroupToPartitions(groupId: PropertyKey, pipes: Pipe<T>[]) {
    if (this.pipes.has(groupId)) {
      throw new Error("Group is already attached to partitions")
    }

    this.pipes.set(groupId, pipes)
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
