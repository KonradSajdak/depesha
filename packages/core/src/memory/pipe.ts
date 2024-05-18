import { PipeDestroyedException } from "../exception"
import { Stream, StreamConsumer, StreamProducer, isConsumer } from "./stream"
import { randomUUID } from "../utils/random-uuid"

export type PipeDestroyer = () => Promise<void>

export const pipe = <T>(
  source: StreamConsumer<T>,
  target: StreamProducer<T>,
): PipeDestroyer => {
  const controller = new AbortController()
  const signal = controller.signal

  const id = randomUUID()

  const destroy = () => {
    return new Promise<void>(resolve => {
      signal.addEventListener("abort", () => resolve())
      controller.abort(new PipeDestroyedException())
    })
  }

  const run = async () => {
    while (!source.isClosed() && !signal.aborted) {
      const message = await source.pull({ signal }).catch((error: unknown) => {
        if (!(error instanceof PipeDestroyedException)) {
          throw error
        }
      })

      if (!message) return
      if (signal.aborted) {
        return message.rollback()
      }

      await target
        .push(message.value)
        .then(() => {
          return message.commit()
        })
        .catch((reason: unknown) => {
          return message.reject(reason)
        })
    }
  }

  run()

  return destroy
}

export class Flow {
  public constructor(private readonly destroyer: PipeDestroyer) {}

  public async destroy() {
    return await this.destroyer()
  }
}

export class Pipe<T> {
  private pipes: Map<StreamProducer<T>, PipeDestroyer> = new Map()

  public constructor(
    private readonly streamOrFactory:
      | StreamConsumer<T>
      | (() => StreamConsumer<T>),
    private readonly previousPipe?: Pipe<unknown>,
  ) {}

  pipe<
    S extends StreamProducer<T> | (StreamProducer<T> & StreamConsumer<O>),
    O = S extends StreamConsumer<infer X> ? X : never,
    R = S extends StreamConsumer<O> ? Pipe<O> : Flow,
  >(producerOrStream: S): R {
    const source =
      typeof this.streamOrFactory === "function"
        ? this.streamOrFactory()
        : this.streamOrFactory

    const unsubscribe = pipe(source, producerOrStream)
    this.pipes.set(producerOrStream, unsubscribe)

    if (isConsumer(producerOrStream)) {
      return new Pipe(producerOrStream, this) as R
    }

    return new Flow(() => this.unpipe(producerOrStream)) as R
  }

  async unpipe(stream: StreamProducer<T>): Promise<void> {
    const unsubscribe = this.pipes.get(stream)
    if (!unsubscribe) return Promise.resolve()

    await unsubscribe()
    this.pipes.delete(stream)
  }

  async unpipeAll(): Promise<void> {
    await Promise.all(
      Array.from(this.pipes.values()).map(unsubscribe => unsubscribe()),
    )
    this.pipes.clear()
  }

  isPiped(stream: StreamProducer<T>): boolean {
    return this.pipes.has(stream)
  }

  totalPipes(): number {
    return this.pipes.size
  }

  async destroy(): Promise<void> {
    await this.unpipeAll()
    await this.previousPipe?.destroy()
  }

  consume(): StreamConsumer<T> {
    return typeof this.streamOrFactory === "function"
      ? this.streamOrFactory()
      : this.streamOrFactory
  }
}

export const fromConsumer = <T>(consumer: StreamConsumer<T>) => {
  return new Pipe(consumer)
}

export const fromStream = <T>(stream: Stream<T>) => {
  return new Pipe(stream)
}
