import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { Stream, SyncStreamProducer } from "./stream";
import { fromBroadcastStream, fromStream, pipe } from "./pipe";
import { autoCommit } from "./auto-commit";
import { BroadcastStream } from "./broadcast-stream";

describe("Pipe", () => {
  describe("piping mechanism", () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.resetAllMocks()
    })

    test("should destroy from a stream", async () => {
      // given
      const streamA = new Stream<string>();
      const streamB = new Stream<string>();

      const destroy = pipe(streamA, streamB);

      // when
      streamA.push("A");

      // then
      const message = await streamB.pull();
      expect(message.value).toBe("A");

      // when
      destroy();
      streamA.push("B");

      // then
      const message2 = streamB.pull({ timeout: 1000 });
      vi.advanceTimersToNextTimer();

      await expect(message2).rejects.toThrow()
    })

    test("should destroy and rollback pushed messages", async () => {
      // given
      const streamA = new Stream<string>();
      const streamB = new Stream<string>();

      const destroy = pipe(streamA, streamB);

      // then
      destroy();

      // when
      streamA.push("A");
      const messageA = streamA.pull({ timeout: 5000 });
      const messageB = streamB.pull({ timeout: 5000 });

      // then
      await expect(messageA).resolves.toHaveProperty("value", "A");

      // when
      vi.advanceTimersToNextTimer()

      // then
      await expect(messageB).rejects.toThrow();
    })

    test("should destroy after piping message", async () => {
      // given
      const streamA = new Stream<string>();
      const streamB = new Stream<string>();

      const destroy = pipe(streamA, streamB);

      // when
      streamA.push("A");

      // then
      await expect(streamB.pull()).resolves.toHaveProperty("value", "A");

      // when
      destroy();
      streamA.push("B");

      // then
      const message = streamB.pull({ timeout: 1000 });
      vi.advanceTimersToNextTimer();

      await expect(message).rejects.toThrow();
    })

    test("should reject message when throwing error", async () => {
      // given
      const streamA = new Stream<string>();
      const streamB = new Stream<string>();
      const streamC = new Stream<string>();
      const rejecter = new class implements SyncStreamProducer<string> {
        public async push(value: string): Promise<string> {
          throw new Error("Error");
        }
      }

      pipe(streamA, streamB);
      pipe(streamB, streamC);
      pipe(streamC, rejecter);

      // then
      expect(streamA.push("A")).rejects.toThrow();
    })
  })

  describe("Stream", () => {
    test("should pipe messages from one stream to another", async () => {
      // given
      const streamA = new Stream<string>()
      const streamB = new Stream<string>()
      const sinkA = fromStream(streamA)
  
      // when
      sinkA.pipe(streamB)
  
      const messages = ["A", "B", "C", "D"]
      messages.forEach(message => streamA.push(message))
  
      // then
      const outputStream = messages.map(() => autoCommit(streamB.pull()))
      expect(
        (await Promise.all(outputStream)).map(message => message.value),
      ).toEqual(messages)
    })
  
    test("should pipe messages from one stream to another sequentially", async () => {
      // given
      const streamA = new Stream<string>()
      const streamB = new Stream<string>()
      const streamC = new Stream<string>()
  
      const sinkA = fromStream(streamA)
  
      // when
      sinkA.pipe(streamB)
      sinkA.pipe(streamC)
  
      const messages = ["A", "B", "C", "D"]
      messages.forEach(message => streamA.push(message))
  
      // then
      const outputStream = [
        autoCommit(streamB.pull()),
        autoCommit(streamC.pull()),
        autoCommit(streamB.pull()),
        autoCommit(streamC.pull()),
      ]
      expect(
        (await Promise.all(outputStream)).map(message => message.value),
      ).toEqual(messages)
    })
  
    test("should unpipe a stream", async () => {
      // given
      const streamA = new Stream<string>()
      const streamB = new Stream<string>()
      const sinkA = fromStream(streamA)
  
      // when
      sinkA.pipe(streamB)
      const messages = ["A", "B"]
      messages.forEach(message => streamA.push(message))
  
      // then
      const outputStream = messages.map(() => autoCommit(streamB.pull()))
      expect(
        (await Promise.all(outputStream)).map(message => message.value),
      ).toEqual(messages)
  
      // when
      sinkA.unpipe(streamB)
      streamA.push("C")
      streamB.push("D")
  
      // then
      const message = await streamB.pull()
      expect(message.value).toBe("D")
      expect(sinkA.totalPipes()).toBe(0)
    })
  
    test("should unpipe all streams", async () => {
      // given
      const streamA = new Stream<string>()
      const streamB = new Stream<string>()
      const streamC = new Stream<string>()
  
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
      sinkA.unpipeAll()
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

  describe("BroadcastStream", () => {
    test("should pipe messages from one stream to another", async () => {
      // given
      const streamA = new BroadcastStream<string>()
      const streamB = new BroadcastStream<string>()

      const consumer = streamB.consume()

      // when
      // streamA.pipe(streamB)
      fromBroadcastStream(streamA).pipe(streamB)

      const messages = ["A", "B", "C", "D"]
      messages.forEach(message => streamA.push(message))

      // then
      const outputStream = messages.map(() => autoCommit(consumer.pull()))
      expect(
        (await Promise.all(outputStream)).map(message => message.value),
      ).toEqual(messages)
    })

    test("should pipe messages from one stream to another concurrently", async () => {
      // given
      const streamA = new BroadcastStream<string>()
      const streamB = new BroadcastStream<string>()
      const streamC = new BroadcastStream<string>()

      const consumerA = streamA.consume()
      const consumerB = streamB.consume()

      // when
      const sinkC = fromBroadcastStream(streamC)
      sinkC.pipe(streamA)
      sinkC.pipe(streamB)

      const messages = ["A", "B", "C", "D"]
      messages.forEach(message => streamC.push(message))

      // then
      const outputStreamA = messages.map(() => autoCommit(consumerA.pull()))
      expect(
        (await Promise.all(outputStreamA)).map(message => message.value),
      ).toEqual(messages)

      const outputStreamB = messages.map(() => autoCommit(consumerB.pull()))
      expect(
        (await Promise.all(outputStreamB)).map(message => message.value),
      ).toEqual(messages)
    })

    test("should unpipe a stream", async () => {
      // given
      const streamA = new BroadcastStream<string>()
      const streamB = new BroadcastStream<string>()

      const consumerB = streamB.consume()
      const sinkA = fromBroadcastStream(streamA)

      // when
      sinkA.pipe(streamB)
      const messages = ["A", "B"]
      messages.forEach(message => streamA.push(message))

      // then
      const outputStream = messages.map(() => autoCommit(consumerB.pull()))
      expect(
        (await Promise.all(outputStream)).map(message => message.value),
      ).toEqual(messages)

      // when
      sinkA.unpipe(streamB)
      streamA.push("C")
      streamB.push("D")

      // then
      const message = await consumerB.pull()
      expect(message.value).toBe("D")
      expect(sinkA.totalPipes()).toBe(0)
    })
  })
})