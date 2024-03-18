import { Stream, StreamConsumer, StreamProducer } from "./stream"

export class Channel<T> implements StreamProducer<T> {
  private readonly buffer: T[] = []
  private readonly consumers: Stream<T>[] = []

  public async push(value: T): Promise<T> {
    if (this.consumers.length === 0) {
      this.buffer.push(value)
      return Promise.resolve(value)
    }

    await Promise.all(this.consumers.map(consumer => consumer.push(value)))
    return Promise.resolve(value)
  }

  public consume(): StreamConsumer<T> {
    const consumer = new Stream<T>()
    this.consumers.push(consumer)

    this.buffer.forEach(message => this.push(message))
    this.buffer.length = 0

    return consumer
  }

  public close() {
    this.buffer.length = 0
    this.consumers.forEach(consumer => consumer.close())
    this.consumers.length = 0
  }

  public inspect() {
    return {
      buffer: this.buffer.length,
      consumers: this.consumers.length,
    }
  }
}
