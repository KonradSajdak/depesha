import { expect } from "vitest"
import { autoCommit } from "../auto-commit"
import { PendingMessage, StreamConsumer } from "../stream"

export const expectMessagesFrom = async <T, R = T>(
  consumer: StreamConsumer<T>,
  messages: R[],
  options?: { signal?: AbortSignal; mapper?: (message: T) => R },
) => {
  const stream = messages.map(() =>
    autoCommit(consumer.pull({ signal: options?.signal })),
  )
  const output = await Promise.all(stream)
  return expect(
    output.map(options?.mapper ?? ((x: T) => x as unknown as R)),
  ).toEqual(messages)
}

export const expectMessages = async <T, R = T>(
  pendings: Promise<PendingMessage<T>>[],
  messages: R[],
  options?: { mapper?: (message: T) => R },
) => {
  return expect(
    (await Promise.all(pendings.map(pending => autoCommit(pending)))).map(
      options?.mapper ?? ((x: T) => x as unknown as R),
    ),
  ).toEqual(messages)
}
