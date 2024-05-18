import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { Stream, StreamProducer } from "./stream"
import { fromStream, pipe } from "./pipe"
import { useFakeAbortSignalTimeout } from "./utils/fake-abort-signal-timeout"
import { expectMessages, expectMessagesFrom } from "./utils/expect-messages"

describe("Pipe", () => {
  describe("piping mechanism", () => {
    useFakeAbortSignalTimeout()

    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.resetAllMocks()
    })

    test("should destroy from a stream", async () => {
      // given
      const streamA = Stream.create<string>()
      const streamB = Stream.create<string>()

      const destroy = pipe(streamA, streamB)

      // when
      streamA.push("A")

      // then
      const message = await streamB.pull()
      expect(message.value).toBe("A")

      // when
      destroy()
      streamA.push("B")

      // then
      const message2 = streamB.pull({ signal: AbortSignal.timeout(1000) })
      vi.advanceTimersToNextTimer()

      await expect(message2).rejects.toThrow()
    })

    test("should destroy and rollback pushed messages", async () => {
      // given
      const streamA = Stream.create<string>()
      const streamB = Stream.create<string>()

      const destroy = pipe(streamA, streamB)

      // then
      await destroy()

      // when
      streamA.push("A")
      const messageA = streamA.pull({ signal: AbortSignal.timeout(5000) })
      const messageB = streamB.pull({ signal: AbortSignal.timeout(5000) })

      // then
      await expect(messageA).resolves.toHaveProperty("value", "A")

      // when
      vi.advanceTimersToNextTimer()

      // then
      await expect(messageB).rejects.toThrow()
    })

    test("should destroy after piping message", async () => {
      // given
      const streamA = Stream.create<string>()
      const streamB = Stream.create<string>()

      const destroy = pipe(streamA, streamB)

      // when
      streamA.push("A")

      // then
      await expect(streamB.pull()).resolves.toHaveProperty("value", "A")

      // when
      destroy()
      streamA.push("B")

      // then
      const message = streamB.pull({ signal: AbortSignal.timeout(1000) })
      vi.advanceTimersToNextTimer()

      await expect(message).rejects.toThrow()
    })

    test("should reject message when throwing error", async () => {
      // given
      const streamA = Stream.create<string>()
      const streamB = Stream.create<string>()
      const streamC = Stream.create<string>()
      const rejecter = new (class implements StreamProducer<string> {
        public async push(): Promise<string> {
          throw new Error("Error")
        }
      })()

      pipe(streamA, streamB)
      pipe(streamB, streamC)
      pipe(streamC, rejecter)

      // then
      expect(streamA.push("A")).rejects.toThrow()
    })
  })

  describe("Stream", () => {
    test("should pipe messages from one stream to another", async () => {
      // given
      const streamA = Stream.create<string>()
      const streamB = Stream.create<string>()

      // when
      fromStream(streamA).pipe(streamB)

      const messages = ["A", "B", "C", "D"]
      messages.forEach(message => streamA.push(message))

      // then
      await expectMessagesFrom(streamB, messages)
    })

    test("should pipe messages from one stream to another sequentially", async () => {
      // given
      const streamA = Stream.create<string>()
      const streamB = Stream.create<string>()
      const streamC = Stream.create<string>()

      const sinkA = fromStream(streamA)

      // when
      sinkA.pipe(streamB)
      sinkA.pipe(streamC)

      const messages = ["A", "B", "C", "D"]
      messages.forEach(message => streamA.push(message))

      // then
      expectMessages(
        [streamB.pull(), streamC.pull(), streamB.pull(), streamC.pull()],
        messages,
      )
    })

    test("should unpipe a stream", async () => {
      // given
      const streamA = Stream.create<string>()
      const streamB = Stream.create<string>()
      const sinkA = fromStream(streamA)

      // when
      sinkA.pipe(streamB)
      const messages = ["A", "B"]
      messages.forEach(message => streamA.push(message))

      // then
      await expectMessagesFrom(streamB, messages)

      // when
      await sinkA.unpipe(streamB)
      streamA.push("C")
      streamB.push("D")

      // then
      const message = await streamB.pull()
      expect(message.value).toBe("D")
      expect(sinkA.totalPipes()).toBe(0)
    })

    test("should unpipe all streams", async () => {
      // given
      const streamA = Stream.create<string>()
      const streamB = Stream.create<string>()
      const streamC = Stream.create<string>()

      const sinkA = fromStream(streamA)

      // when
      sinkA.pipe(streamB)
      sinkA.pipe(streamC)

      const messages = ["A", "B"]
      messages.forEach(message => streamA.push(message))

      // then
      const outputStreamB = ["A"].map(() => streamB.pull())
      const outputStreamC = ["B"].map(() => streamC.pull())
      expect(
        (await Promise.all(outputStreamB)).map(message => message.value),
      ).toEqual(["A"])
      expect(
        (await Promise.all(outputStreamC)).map(message => message.value),
      ).toEqual(["B"])

      // when
      await sinkA.unpipeAll()
      streamA.push("C")
      streamB.push("D")
      streamC.push("E")

      // then
      const messageB = await streamB.pull()
      const messageC = await streamC.pull()
      expect(messageB.value).toBe("D")
      expect(messageC.value).toBe("E")
      expect(sinkA.totalPipes()).toBe(0)
    })
  })
})
