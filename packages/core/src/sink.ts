import { pipe } from "./pipe"
import { StreamConsumer, StreamProducer } from "./stream"

export const sink = <T>(
  sources: StreamConsumer<T>[],
  target: StreamProducer<T>,
): (() => void) => {
  const destroyers = sources.map(source => pipe(source, target))
  return () => destroyers.forEach(destroy => destroy())
}
