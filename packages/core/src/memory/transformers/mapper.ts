import {
  PendingMessage,
  Stream,
  StreamConsumer,
  StreamProducer,
} from "../stream"

export class Mapper<T, O = T> implements StreamProducer<T>, StreamConsumer<O> {
  private readonly stream = Stream.create<O>()

  public constructor(private readonly mapper: (value: T) => O) {}

  public async push(value: T): Promise<T> {
    await this.stream.push(this.mapper(value))
    return value
  }

  public async pull(): Promise<PendingMessage<O>> {
    return this.stream.pull()
  }

  public isClosed(): boolean {
    return this.stream.isClosed()
  }
}
