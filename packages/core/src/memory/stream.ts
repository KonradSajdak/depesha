import { Deferred } from "./deferred"

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
      throw new Error("Stream is closed")
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
      throw new Error("Stream is closed")
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
    this.pushes.forEach(
      ({ defer: { reject } }) => void reject().catch(() => {}),
    )
    this.pulls.forEach(({ reject }) => void reject().catch(() => {}))
  }
}
