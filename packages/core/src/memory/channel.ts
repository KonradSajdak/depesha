import { Stream, StreamConsumer, StreamProducer } from "./stream"

export class Channel<T> implements StreamProducer<T> {
  private readonly consumers: Stream<T>[] = []

  public async push(value: T): Promise<T> {
    if (this.consumers.length !== 0) {
      await Promise.all(this.consumers.map(consumer => consumer.push(value)))
    }

    return Promise.resolve(value)
  }

  public consume(): StreamConsumer<T> {
    const consumer = new Stream<T>()
    this.consumers.push(consumer)

    return consumer
  }
}
