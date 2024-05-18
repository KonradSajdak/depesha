import { Deferred } from "./deferred"
import {
  ChannelClosedAlreadyException,
  ChannelWasClosedException,
} from "./exception"
import { LinkedList, Locked } from "./linked-list"

export interface PushedMessage<T> {
  value: T
  defer: Deferred<T>
}

export interface PendingMessage<T> {
  value: T
  commit: () => Promise<T>
  rollback: () => Promise<PendingMessage<T>> | Promise<void>
  reject: (reason?: unknown) => void
}

export interface PullingOptions {
  signal?: AbortSignal
}

export type StreamProducer<T> = {
  push(value: T): Promise<T>
}
export type StreamConsumer<T> = {
  pull(options?: PullingOptions): Promise<PendingMessage<T>>
  isClosed(): boolean
}

export const isProducer = (
  producer: unknown,
): producer is StreamProducer<unknown> => {
  return (
    typeof producer === "object" &&
    producer !== null &&
    "push" in producer &&
    typeof producer.push === "function"
  )
}

export const isConsumer = (
  consumer: unknown,
): consumer is StreamConsumer<unknown> => {
  return (
    typeof consumer === "object" &&
    consumer !== null &&
    "pull" in consumer &&
    "isClosed" in consumer &&
    typeof consumer.pull === "function" &&
    typeof consumer.isClosed === "function"
  )
}

class StreamController {
  private paused: boolean = false
  private pauseResumed: Deferred<void> = new Deferred()

  public pause() {
    if (this.paused) return
    this.paused = true
  }

  public isPaused() {
    return this.paused
  }

  public resume() {
    if (!this.paused) return

    this.paused = false
    this.pauseResumed.resolve()
    this.pauseResumed = new Deferred()
  }

  public async wait() {
    if (!this.paused) {
      return
    }

    return this.pauseResumed.promise
  }

  public async whenResume() {
    return this.wait()
  }
}

export class Stream<T> implements StreamProducer<T>, StreamConsumer<T> {
  private closed: boolean = false
  private flow = new StreamController()

  public readonly pending: Deferred<PendingMessage<T>>[] = []

  private constructor(
    public readonly stream: LinkedList<PushedMessage<T>> = new LinkedList(),
  ) {}

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
      reject: (reason?: unknown) => {
        node.commit()
        return defer.reject(reason)
      },
    }
  }

  public async push(value: T): Promise<T> {
    if (this.closed) {
      throw new ChannelClosedAlreadyException()
    }

    if (this.flow.isPaused()) {
      const defer = new Deferred<T>()

      this.flow
        .whenResume()
        .then(() => this.push(value))
        .then(value => defer.resolve(value))

      return defer.promise
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

    if (this.flow.isPaused()) {
      const defer = new Deferred<PendingMessage<T>>({ signal: options?.signal })

      this.flow
        .whenResume()
        .then(() => this.pull(options))
        .then(value => defer.resolve(value))

      return defer.promise
    }

    const next = this.stream.shiftWithLock()

    if (!next) {
      const defer = new Deferred<PendingMessage<T>>({ signal: options?.signal })
      this.pending.push(defer)

      return defer.promise.catch(() => {
        this.pending.splice(this.pending.indexOf(defer), 1)
        return defer.promise
      })
    }

    const { value, defer } = next.value
    return this.createMessage(value, next, defer)
  }

  public clone(): Stream<T> {
    return new Stream(this.stream.clone())
  }

  public pause() {
    return this.flow.pause()
  }

  public resume() {
    return this.flow.resume()
  }

  public isPaused() {
    return this.flow.isPaused()
  }

  public async close() {
    this.closed = true

    const reject = <T>(defer: Deferred<T>) =>
      defer.reject(new ChannelWasClosedException())

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

  public static create<T>(): Stream<T> {
    return new Stream()
  }
}
