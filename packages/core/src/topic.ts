import { Deferred } from "./deferred"
import { PipeDestroyer, pipe } from "./pipe"
import { Stream, StreamConsumer, StreamProducer } from "./stream"
import { MaybePromise } from "./utils/types"

export interface TopicMessageOptions {
  partition?: number
}

export interface TopicConsumingOptions {
  groupId?: string
}

export const calculatePartitionConsumer = (
  partitionNumber: number,
  totalConsumers: number,
): number => {
  return totalConsumers > 0 ? ((partitionNumber - 1) % totalConsumers) + 1 : 0
}

interface DistributionMetadataProvider<T> {
  partitionNumber: () => MaybePromise<number>
  totalConsumers: (groupId: string) => MaybePromise<number>
  groups: () => MaybePromise<string[]>
  consumer: (groupId: string, number: number) => MaybePromise<StreamProducer<T>>
}

class Distributor<T> implements StreamProducer<T> {
  public constructor(
    private readonly provider: DistributionMetadataProvider<T>,
  ) {}

  public async push(value: T): Promise<T> {
    const groups = await this.provider.groups()
    const promises = groups.map(groupId => this.pushToGroup(value, groupId))

    await Promise.all(promises)

    return value
  }

  private async pushToGroup(value: T, groupId: string): Promise<T> {
    const consumerNumber = calculatePartitionConsumer(
      await this.provider.partitionNumber(),
      await this.provider.totalConsumers(groupId),
    )

    const consumer = await this.provider.consumer(groupId, consumerNumber)
    return consumer.push(value)
  }
}

class DeferredMap<K, V> extends Map<K, V> {
  private defer?: Deferred<[K, V]>

  public async waitIfEmptyAndThen<R>(
    callback: (map: this) => MaybePromise<R>,
  ): Promise<R> {
    if (this.size > 0) {
      return Promise.resolve(callback(this))
    }

    if (!this.defer) {
      this.defer = new Deferred()
    }

    return this.defer.promise.then(() => callback(this))
  }

  public override set(key: K, value: V): this {
    const result = super.set(key, value)

    if (this.defer && this.size > 0) {
      this.defer.resolve([key, value])
      this.defer = undefined
    }

    return result
  }
}

export class Partitioner<T> {
  private readonly sources: Map<
    Stream<T>,
    { number: number; destroyer: PipeDestroyer }
  > = new Map()

  private readonly targetGroups: DeferredMap<
    PropertyKey,
    DeferredMap<number, Stream<T>>
  > = new DeferredMap()

  public addSource(source: Stream<T>) {
    const number = this.sources.size + 1

    const destroyer = pipe(
      source,
      new Distributor<T>({
        partitionNumber: () => this.sources.get(source)?.number ?? 1,
        totalConsumers: groupId =>
          this.targetGroups.waitIfEmptyAndThen(targets =>
            targets
              .get(groupId)!
              .waitIfEmptyAndThen(targets => targets.size ?? 0),
          ),
        groups: () =>
          this.targetGroups.waitIfEmptyAndThen(
            targets => Array.from(targets.keys()) as string[],
          ),
        consumer: (groupId: string, number: number) => {
          return this.targetGroups.get(groupId)!.get(number)!
        },
      }),
    )

    this.sources.set(source, { number, destroyer })
  }

  public removeSource(source: Stream<T>) {
    const metadata = this.sources.get(source)
    if (!metadata) return

    this.sources.delete(source)
    this.reorderSources()

    return metadata.destroyer()
  }

  public addTarget(target: Stream<T>, groupId?: string) {
    const targetGroupId = groupId ?? Symbol()
    const number = (this.targetGroups.get(targetGroupId)?.size ?? 0) + 1

    if (!this.targetGroups.get(targetGroupId)) {
      this.targetGroups.set(targetGroupId, new DeferredMap())
    }

    this.targetGroups.get(targetGroupId)!.set(number, target)
  }

  public removeTarget(target: Stream<T>) {
    for (const [groupId, targets] of this.targetGroups.entries()) {
      for (const [number, stream] of targets.entries()) {
        if (stream === target) {
          targets.delete(number)
          this.reorderTargets(groupId)
          return
        }
      }
    }
  }

  private reorderSources() {
    let i = 1
    for (const [source, metadata] of this.sources.entries()) {
      this.sources.set(source, { ...metadata, number: i++ })
    }
  }

  private reorderTargets(groupId: PropertyKey) {
    let i = 1
    const group = this.targetGroups.get(groupId)!

    for (const [number, target] of group.entries()) {
      group.set(i++, target)
    }

    this.targetGroups.set(groupId, group)
  }
}

export class Topic<T> implements StreamProducer<T> {
  private readonly partitioner: Partitioner<T> = new Partitioner<T>()
  private readonly partitions: Stream<T>[] = []

  public async push(value: T, options?: TopicMessageOptions): Promise<T> {
    return this.partition(options?.partition).push(value)
  }

  public consume(options?: TopicConsumingOptions): StreamConsumer<T> {
    const consumer = Stream.create<T>()
    this.partitioner.addTarget(consumer, options?.groupId)

    return consumer
  }

  public close() {
    for (const partition of this.partitions) {
      partition.close()
    }

    this.partitions.length = 0
  }

  private partition(partition?: number) {
    const { index } = this.partitionMetadata(partition)
    if (!this.partitions[index]) {
      this.partitions[index] = Stream.create<T>()
      this.partitioner.addSource(this.partitions[index])
    }

    return this.partitions[index]
  }

  private partitionMetadata(partition?: number) {
    const partitionNumber = partition ?? 1
    return {
      number: partitionNumber,
      index: partitionNumber - 1,
    }
  }
}
