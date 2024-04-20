import { describe, expect, test } from "vitest";
import { Stream } from "./stream";
import { fromBroadcastStream, fromStream } from "./pipe";
import { autoCommit } from "./auto-commit";
import { BroadcastStream } from "./broadcast-stream";

describe("Pipe", () => {
  describe("Pipe - Stream", () => {
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
    })
  })

  describe("Pipe - BroadcastStream", () => {
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
    })
  })
})