import { AsyncStreamProducer, SyncStreamProducer } from "./stream"

export class Subscriber<T>
  implements SyncStreamProducer<T>, AsyncStreamProducer<T>
{
  public constructor(private readonly callback: (value: T) => void) {}

  public async push(value: T): Promise<T> {
    this.callback(value)
    return Promise.resolve(value)
  }
}
