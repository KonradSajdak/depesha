import { Deferred } from "./deferred"
import { StreamProducer } from "./stream"

export const bufferUntil = <T, TProducer extends StreamProducer<T>>(
  producer: TProducer,
  promise: Promise<unknown>,
): TProducer => {
  let resolved = false
  const buffer: { defer: Deferred<T>; value: T }[] = []

  promise.then(() => {
    resolved = true

    buffer.forEach(deferred => {
      const { defer, value } = deferred
      producer.push(value).then(() => defer.resolve(deferred.value))
    })
  })

  return {
    push: async (value: T) => {
      if (resolved) {
        return producer.push(value)
      }

      const defer = new Deferred<T>()

      buffer.push({ defer, value })
      return defer.promise
    },
  } as TProducer
}
