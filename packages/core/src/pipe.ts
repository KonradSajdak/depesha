import { R } from "vitest/dist/reporters-LqC_WI4d";
import { BroadcastStream } from "./broadcast-stream";
import { Forwarder } from "./forwarder";
import { Stream, StreamConsumer, StreamProducer, isConsumer } from "./stream"

export const pipe = <T>(source: StreamConsumer<T>, target: StreamProducer<T>): () => void => {
  let unsubscribed = false;

  const subscribe = async () => {
    while (!source.isClosed() && !unsubscribed) {
      const message = await source.pull()
      await target
        .push(message.value)
        .then(() => message.commit())
        .catch((reason) => message.reject(reason))
    }
  }

  subscribe();

  return () => {
    unsubscribed = true
  }
}

export class Flow {
  public constructor(private readonly destroyer: () => void) {}

  destroy() {
    this.destroyer();
  }
}

export class Pipe<T> {
  private pipes: Map<StreamProducer<T>, () => void> = new Map()

  public constructor(private readonly streamOrFactory: StreamConsumer<T> | (() => StreamConsumer<T>), private readonly previousPipe?: Pipe<unknown>) {}

  pipe<
    S extends StreamProducer<T> | (StreamProducer<T> & StreamConsumer<O>),
    O = S extends StreamConsumer<infer X> ? X : never,
    R = S extends StreamConsumer<O> ? Pipe<O> : Flow
  >(producerOrStream: S): R {
    const source = typeof this.streamOrFactory === "function" ? this.streamOrFactory() : this.streamOrFactory

    const unsubscribe = pipe(source, producerOrStream)
    this.pipes.set(producerOrStream, unsubscribe)

    if (isConsumer(producerOrStream)) {
      return new Pipe(producerOrStream, this) as R
    }

    return new Flow(() => this.unpipe(producerOrStream)) as R;
  }

  unpipe(stream: StreamProducer<T> | Stream<T>): void {
    const unsubscribe = this.pipes.get(stream)
    if (!unsubscribe) return

    unsubscribe()
    this.pipes.delete(stream)
  }

  unpipeAll(): void {
    this.pipes.forEach(unsubscribe => unsubscribe())
    this.pipes.clear()
  }

  destroy() {
    this.unpipeAll();
    this.previousPipe?.destroy()
  }
}

export const fromConsumer = <T>(consumer: StreamConsumer<T>) => {
  return new Pipe(consumer);
}

export const fromStream = <T>(stream: Stream<T>) => {
  return new Pipe(stream);
}

export const fromBroadcastStream = <T>(stream: BroadcastStream<T>) => {
  return new Pipe(() => stream.consume());
}