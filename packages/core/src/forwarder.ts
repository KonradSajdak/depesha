import { AsyncStreamProducer, Pending, Stream, StreamConsumer, StreamProducer, SyncStreamProducer} from "./stream";

export class Forwarder<T> implements SyncStreamProducer<T>, AsyncStreamProducer<T>, StreamConsumer<T> {
  private readonly stream = new Stream<T>();
  
  public constructor(private readonly producer: StreamProducer<T>) {}

  public isClosed(): boolean {
    return this.stream.isClosed();
  }

  public async push(value: T): Promise<T> {
    await Promise.all([
      this.producer.push(value),
      this.stream.push(value)
    ]);

    return value;
  }

  public async pull(): Promise<Pending<T>> {
    return this.stream.pull();
  }
}