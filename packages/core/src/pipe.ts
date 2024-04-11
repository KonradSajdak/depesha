import { StreamConsumer, StreamProducer } from "./stream"

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