import { Deferred } from "./deferred"
import {
  ChannelClosedAlreadyException,
  ChannelWasClosedException,
  PullingTimeoutException,
} from "./exception"
import { LinkedList, Locked } from "./linked-list"

export interface PushedMessage<T> {
  value: T
  defer: Deferred<T>
}

export interface PendingMessage<T> {
  value: T
  commit: () => void
  rollback: () => void
  reject: (reason?: any) => void
}

export interface PullingOptions {
  timeout?: number
}

export type StreamProducer<T> = { push(value: T): Promise<T> }
export type StreamConsumer<T> = {
  pull(options?: PullingOptions): Promise<PendingMessage<T>>
  isClosed(): boolean
}

export const isProducer = (
  producer: unknown,
): producer is StreamProducer<any> => {
  return (
    typeof producer === "object" &&
    producer !== null &&
    "push" in producer &&
    typeof producer.push === "function"
  )
}

export const isConsumer = (
  consumer: unknown,
): consumer is StreamConsumer<any> => {
  return (
    typeof consumer === "object" &&
    consumer !== null &&
    "pull" in consumer &&
    "isClosed" in consumer &&
    typeof consumer.pull === "function" &&
    typeof consumer.isClosed === "function"
  )
}

export class Stream<T> implements StreamProducer<T>, StreamConsumer<T> {
  private closed: boolean = false

  public readonly stream: LinkedList<PushedMessage<T>>
  public readonly pending: Deferred<PendingMessage<T>>[]

  public constructor() {
    this.stream = new LinkedList()
    this.pending = []
  }

  private createMessage(
    value: T,
    node: Locked<PushedMessage<T>>,
    defer: Deferred<T>,
  ): PendingMessage<T> {
    return {
      value,
      commit: () => {
        node.commit()
        return defer.resolve(value)
      },
      rollback: () => {
        const pending = this.pending.shift()
        if (!pending) {
          node.rollback()
          return Promise.resolve()
        }

        const message = this.createMessage(value, node, defer)
        return pending.resolve(message)
      },
      reject: (reason?: any) => {
        node.commit()
        return defer.reject(reason)
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

  public async pull(options?: PullingOptions): Promise<PendingMessage<T>> {
    if (this.closed) {
      throw new ChannelClosedAlreadyException()
    }

    const timeout = options?.timeout ?? null
    const next = this.stream.shiftWithLock()

    if (!next) {
      const defer = new Deferred<PendingMessage<T>>()
      this.pending.push(defer)

      if (timeout === null) return defer.promise

      const cancelTimeout = setTimeout(() => {
        defer.reject(new PullingTimeoutException(timeout))
      }, timeout)

      return defer.promise.finally(() => clearTimeout(cancelTimeout))
    }

    const { value, defer } = next.value
    return this.createMessage(value, next, defer)
  }

  public async close() {
    this.closed = true

    const reject = (defer: Deferred<any>) => {
      defer.reject(new ChannelWasClosedException())
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
