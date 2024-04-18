import {
  Pending,
  Stream,
  StreamConsumer
} from "./stream"
import { AsyncStreamProducer, SyncStreamProducer } from "./stream"

export class Transformer<T, O = T>
  implements
    SyncStreamProducer<T>,
    AsyncStreamProducer<T>,
    StreamConsumer<O>
{
  private readonly stream = new Stream<O>()

  public constructor(private readonly mapper: (value: T) => O) {}

  public async push(value: T): Promise<T> {
    await this.stream.push(this.mapper(value))
    return value
  }

  public async pull(): Promise<Pending<O>> {
    return this.stream.pull()
  }

  public isClosed(): boolean {
    return this.stream.isClosed()
  }
}
