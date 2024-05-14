import { StreamProducer, Stream } from "./stream"

export interface FlushOptions {
  signal?: AbortSignal
}

export const flush = async <T>(
  source: Stream<T>,
  target: StreamProducer<T> | StreamProducer<T>[],
  options?: FlushOptions,
) => {
  if (source.isClosed()) return
  if (options?.signal?.aborted) return

  const targets = Array.isArray(target) ? target : [target]

  while (!source.isClosed() && !options?.signal?.aborted) {
    const message = await source.pull(options).catch((error: unknown) => {
      throw error
    })

    if (!message) return

    if (options?.signal?.aborted) {
      message.rollback()
      return
    }

    Promise.all(targets.map(target => target.push(message.value)))
      .then(() => {
        return message.commit()
      })
      .catch((reason: unknown) => {
        return message.reject(reason)
      })
  }

  source.close()
}
