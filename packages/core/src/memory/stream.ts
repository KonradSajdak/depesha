import { Deferred } from "./deferred"
import {
  ChannelClosedAlreadyException,
  ChannelWasClosedException,
} from "./exception"

export interface Pushed<T> {
  value: T
  defer: Deferred<T>
}

export interface StreamProducer<T> {
  push(value: T): Promise<T>
}

export interface StreamConsumer<T> {
  pull(): Promise<T>
}

export class Stream<T> implements StreamProducer<T>, StreamConsumer<T> {
  private closed: boolean = false

  public readonly pushes: Pushed<T>[]
  public readonly pulls: Deferred<T>[]

  public constructor() {
    this.pushes = []
    this.pulls = []
  }

  public async push(value: T): Promise<T> {
    if (this.closed) {
      throw new ChannelClosedAlreadyException()
    }

    const pulling = this.pulls.shift()
    if (pulling) {
      return pulling.resolve(value)
    }

    const defer = new Deferred<T>()
    this.pushes.push({ value, defer })

    return defer.promise
  }

  public async pull(): Promise<T> {
    if (this.closed) {
      throw new ChannelClosedAlreadyException()
    }

    const pushing = this.pushes.shift()

    if (!pushing) {
      const defer = new Deferred<T>()
      this.pulls.push(defer)

      return defer.promise
    }

    const { defer, value } = pushing
    defer.resolve(value)

    return defer.promise
  }

  public async close() {
    this.closed = true

    const reject = (defer: Deferred<T>) => {
      defer.reject(new ChannelWasClosedException()).catch(() => {})
    }

    await Promise.allSettled([
      Promise.allSettled(this.pulls.map(defer => reject(defer))),
      Promise.allSettled(this.pushes.map(({ defer }) => reject(defer))),
    ])

    this.pushes.length = 0
    this.pulls.length = 0
  }

  public stats() {
    return {
      pushes: this.pushes.length,
      pulls: this.pulls.length,
    }
  }
}
