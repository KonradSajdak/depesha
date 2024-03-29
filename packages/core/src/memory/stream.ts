import { Deferred } from "./deferred"
import {
  ChannelClosedAlreadyException,
  ChannelWasClosedException,
} from "./exception"
import { LinkedList } from "./linked-list"

export interface Pushed<T> {
  value: T
  defer: Deferred<T>
}

export interface Pending<T> {
  value: T
  commit: () => void
  rollback: () => void
}

export interface AsyncStreamProducer<T> {
  push(value: T): Promise<any>
}

export interface SyncStreamProducer<T> {
  push(value: T): Promise<T>
}

export type StreamProducer<T> = SyncStreamProducer<T> | AsyncStreamProducer<T>

export interface StreamConsumer<T> {
  pull(): Promise<Pending<T>>
  pipe(producer: StreamProducer<T>): StreamProducer<T>
}

export interface StreamOptions {
  autoCommit?: boolean
}

export class Stream<T>
  implements SyncStreamProducer<T>, AsyncStreamProducer<T>, StreamConsumer<T>
{
  private closed: boolean = false
  private autoCommit: boolean

  public readonly stream: LinkedList<Pushed<T>>
  public readonly pending: Deferred<Pending<T>>[]

  public constructor(options?: StreamOptions) {
    this.stream = new LinkedList()
    this.pending = []

    this.autoCommit = options?.autoCommit ?? true
  }

  public async push(value: T): Promise<T> {
    if (this.closed) {
      throw new ChannelClosedAlreadyException()
    }

    const defer = new Deferred<T>()

    const pending = this.pending.shift()
    if (pending) {
      const node = this.stream.appendWithLock({ value, defer })

      const message = {
        value,
        commit: () => {
          node.commit()
          return defer.resolve(value)
        },
        rollback: node.rollback,
      }

      if (this.autoCommit) {
        await message.commit()
      }

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

    const message = {
      value: value,
      commit: () => {
        next.commit()
        return defer.resolve(value)
      },
      rollback: next.rollback,
    }

    if (this.autoCommit) {
      await message.commit()
    }

    return message
  }

  public pipe(stream: StreamProducer<T>) {
    const pipeTo = async () => {
      if (this.closed) return

      const message = await this.pull()
      await stream.push(message.value)

      pipeTo()
    }

    pipeTo()

    return stream
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
}
