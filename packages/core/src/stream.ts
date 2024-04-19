import { Deferred } from "./deferred"
import {
  ChannelClosedAlreadyException,
  ChannelWasClosedException,
} from "./exception"
import { LinkedList, Locked } from "./linked-list"

export interface Pushed<T> {
  value: T
  defer: Deferred<T>
}

export interface Pending<T> {
  value: T
  commit: () => void
  rollback: () => void
  reject: (reason?: any) => void
}

export interface AsyncStreamProducer<T> {
  push(value: T): Promise<any>
}

export interface SyncStreamProducer<T> {
  push(value: T): Promise<T>
}

export type StreamProducer<T> = SyncStreamProducer<T> | AsyncStreamProducer<T>
export type StreamConsumer<T> = { pull(): Promise<Pending<T>>, isClosed(): boolean }

export const isProducer = (producer: unknown): producer is StreamProducer<any> => {
  return typeof producer === 'object' 
    && producer !== null 
    && 'push' in producer 
    && typeof producer.push === "function";
}

export const isConsumer = (consumer: unknown): consumer is StreamConsumer<any> => {
  return typeof consumer === 'object'
    && consumer !== null
    && 'pull' in consumer
    && 'isClosed' in consumer
    && typeof consumer.pull === "function" 
    && typeof consumer.isClosed === "function";
}

export class Stream<T>
  implements
    SyncStreamProducer<T>,
    AsyncStreamProducer<T>,
    StreamConsumer<T>
{
  private closed: boolean = false

  public readonly stream: LinkedList<Pushed<T>>
  public readonly pending: Deferred<Pending<T>>[]

  public constructor() {
    this.stream = new LinkedList()
    this.pending = []
  }

  private createMessage(
    value: T,
    node: Locked<Pushed<T>>,
    defer: Deferred<T>,
  ): Pending<T> {
    return {
      value,
      commit: () => {
        node.commit()
        return defer.resolve(value)
      },
      rollback: node.rollback,
      reject: (reason?: any) => {
        node.commit()
        return defer.reject(reason).catch(() => {})
      },
    }
  }

  public async push(value: T): Promise<T> {
    if (this.closed) {
      throw new ChannelClosedAlreadyException()
    }

    const defer = new Deferred<T>()

    const pending = this.pending.shift()
    if (pending) {
      const node = this.stream.appendWithLock({ value, defer })
      const message = this.createMessage(value, node, defer)

      return pending.resolve(message).then(() => defer.promise)
    }

    this.stream.append({ value, defer })
    return defer.promise
  }

  public async pull(): Promise<Pending<T>> {
    if (this.closed) {
      throw new ChannelClosedAlreadyException()
    }

    const next = this.stream.shiftWithLock()

    if (!next) {
      const defer = new Deferred<Pending<T>>()
      this.pending.push(defer)

      return defer.promise
    }

    const { value, defer } = next.value
    return this.createMessage(value, next, defer)
  }

  public async close() {
    this.closed = true

    const reject = (defer: Deferred<any>) => {
      defer.reject(new ChannelWasClosedException()).catch(() => {})
    }

    await Promise.allSettled([
      Promise.allSettled(this.pending.map(defer => reject(defer))),
      Promise.allSettled(
        this.stream.map(({ defer }) => reject(defer)).toArray(),
      ),
    ])

    this.stream.erase()
    this.pending.length = 0
  }

  public inspect() {
    return {
      pushes: this.stream.size(),
      pulls: this.pending.length,
    }
  }

  public isClosed() {
    return this.closed
  }
}
