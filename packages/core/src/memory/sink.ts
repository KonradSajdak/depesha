import { Pending, Stream, StreamConsumer, StreamProducer } from "./stream"

export class Sink<T> implements StreamConsumer<T> {
  private drain: Stream<T> = new Stream<T>()

  public attachTo(stream: StreamConsumer<T>) {
    stream.pipe(this.drain)
  }

  public async pull(): Promise<Pending<T>> {
    return this.drain.pull()
  }

  public pipe(producer: StreamProducer<T>): StreamProducer<T> {
    return this.drain.pipe(producer)
  }
}
