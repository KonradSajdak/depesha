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

export class ConsumerGroup<T>
  implements SyncStreamProducer<T>, AsyncStreamProducer<T>
{
  private readonly autoCommit?: boolean

  private readonly partitions: Stream<T>[] = []
  private readonly consumers: Stream<T>[] = []

  public constructor(options?: ChannelOptions) {
    this.autoCommit = options?.autoCommit
  }

  public async push(value: T, options?: PushingOptions): Promise<T> {
    const partitionNumber = options?.partition ?? 1
    const partitionIndex = partitionNumber - 1

    if (this.partitions[partitionIndex] === undefined) {
      this.partitions[partitionIndex] = new Stream<T>({
        autoCommit: this.autoCommit,
      })
      this.rebalance()
    }

    await this.partitions[partitionIndex].push(value)
    return Promise.resolve(value)
  }

  public consume(): StreamConsumer<T> {
    const stream = new Stream<T>({ autoCommit: this.autoCommit })
    this.consumers.push(stream)

    this.rebalance()

    return stream
  }

  private rebalance() {
    this.partitions.forEach(partition => partition.unpipeAll())

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
}
