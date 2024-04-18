import { BroadcastStream } from "./broadcast-stream";
import { Forwarder } from "./forwarder";
import { Stream, StreamConsumer, StreamProducer } from "./stream"

export const pipe = <T, TSource extends StreamConsumer<T>, TTarget extends StreamProducer<T>>(source: TSource, target: TTarget): () => void => {
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

export class Pipe<T> {
  private pipes: Map<StreamProducer<T>, () => void> = new Map()

  public constructor(private readonly streamOrFactory: StreamConsumer<T> | (() => StreamConsumer<T>), private readonly sink?: Pipe<unknown>) {}

  pipe<TSource extends StreamProducer<T> | Stream<T>>(stream: TSource) {
    const source = typeof this.streamOrFactory === "function" ? this.streamOrFactory() : this.streamOrFactory

    const unsubscribe = pipe(source, stream)
    this.pipes.set(stream, unsubscribe)

    if (stream instanceof Stream) {
      return new Pipe(stream, this)
    }

    return new Pipe(new Forwarder(stream), this)
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
    this.sink?.destroy();
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