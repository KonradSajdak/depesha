import { Deferred } from "./deferred"
import {
  ChannelClosedAlreadyException,
  ChannelWasClosedException,
} from "./exception"

export interface Pushed<T> {
  value: T
  defer: Deferred<T>
}

export interface AsyncStreamProducer<T> {
  push(value: T): Promise<any>
}

export interface SyncStreamProducer<T> {
  push(value: T): Promise<T>
}

export interface StreamConsumer<T> {
  pull(): Promise<T>
}

export class Stream<T>
  implements SyncStreamProducer<T>, AsyncStreamProducer<T>, StreamConsumer<T>
{
  private closed: boolean = false

  public readonly buffer: Pushed<T>[]
  public readonly pending: Deferred<T>[]

  public constructor() {
    this.buffer = []
    this.pending = []
  }

  public async push(value: T): Promise<T> {
    if (this.closed) {
      throw new ChannelClosedAlreadyException()
    }

    const pending = this.pending.shift()
    if (pending) {
      return pending.resolve(value)
    }

    const defer = new Deferred<T>()
    this.buffer.push({ value, defer })

    return defer.promise
  }

  public async pull(): Promise<T> {
    if (this.closed) {
      throw new ChannelClosedAlreadyException()
    }

    const message = this.buffer.shift()

    if (!message) {
      const defer = new Deferred<T>()
      this.pending.push(defer)

      return defer.promise
    }

    const { defer, value } = message
    defer.resolve(value)

    return defer.promise
  }

  public async close() {
    this.closed = true

    const reject = (defer: Deferred<T>) => {
      defer.reject(new ChannelWasClosedException()).catch(() => {})
    }

    await Promise.allSettled([
      Promise.allSettled(this.pending.map(defer => reject(defer))),
      Promise.allSettled(this.buffer.map(({ defer }) => reject(defer))),
    ])

    this.buffer.length = 0
    this.pending.length = 0
  }

  public inspect() {
    return {
      pushes: this.buffer.length,
      pulls: this.pending.length,
    }
  }
}
