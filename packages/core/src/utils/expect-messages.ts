import { expect } from "vitest"
import { autoCommit } from "../auto-commit"
import { PendingMessage, StreamConsumer } from "../stream"

export const expectMessagesFrom = async <T>(
  consumer: StreamConsumer<T>,
  messages: T[],
  options?: { signal?: AbortSignal },
) => {
  const stream = messages.map(() =>
    autoCommit(consumer.pull({ signal: options?.signal })),
  )
  const output = await Promise.all(stream)
  return expect(output).toEqual(messages)
}

export const expectMessages = async <T>(
  pendings: Promise<PendingMessage<T>>[],
  messages: T[],
) => {
  return expect(
    await Promise.all(pendings.map(pending => autoCommit(pending))),
  ).toEqual(messages)
}
