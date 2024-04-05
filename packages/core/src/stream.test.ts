import { test, expect, describe } from "vitest"
import { Stream } from "./stream"
import {
  ChannelClosedAlreadyException,
  ChannelWasClosedException,
} from "./exception"
import { autoCommit } from "./auto-commit"

describe("Stream", () => {
  test("should push a message async", async () => {
    // given
    const stream = new Stream<string>()

    // when
    stream.push("test")

    // then
    const result = await stream.pull()
    expect(result.value).toBe("test")
  })

  test("should push a message sync", async () => {
    // given
    const stream = new Stream<string>()

    // when
    const pushing = stream.push("test")
    const result = await stream.pull()

    result.commit()

    // then
    expect(result.value).toBe("test")
    expect(pushing).resolves.toBe("test")
  })

  test("should pull a message", async () => {
    // given
    const stream = new Stream<string>()

    // then
    const result = stream.pull()

    // when
    stream.push("test")

    // then
    await expect(result).resolves.toHaveProperty("value", "test")
  })

  test("should pull a stream after pushing", async () => {
    // given
    const stream = new Stream<string>()
    const inputStream = ["A", "B", "C", "D"]

    // when
    inputStream.forEach(message => stream.push(message))

    // then
    const outputStream = inputStream.map(() => stream.pull())
    expect(
      (await Promise.all(outputStream)).map(message => message.value),
    ).toEqual(inputStream)
  })

  test("should wait for stream when pulling before push", async () => {
    // given
    const stream = new Stream<string>()
    const inputStream = ["A", "B", "C", "D"]

    // when
    const outputStream = inputStream.map(() => stream.pull())
    inputStream.forEach(message => stream.push(message))

    // then
    expect(
      (await Promise.all(outputStream)).map(message => message.value),
    ).toEqual(inputStream)
  })

  test("should close the stream", async () => {
    // given
    const stream = new Stream<string>()
    const inputStream = ["A", "B", "C", "D"]

    // when
    const pushes = inputStream.map(message => stream.push(message))

    // then
    expect(stream.inspect()).toEqual({ pushes: 4, pulls: 0 })

    // when
    await stream.close()

    // then
    expect(Promise.all(pushes)).rejects.toThrow(ChannelWasClosedException)
    expect(stream.inspect()).toEqual({ pushes: 0, pulls: 0 })
  })

  test("should disable pushing and pulling after closing", async () => {
    // given
    const stream = new Stream<string>()

    // when
    await stream.close()

    // then
    await expect(stream.push("test")).rejects.toThrow(
      ChannelClosedAlreadyException,
    )
    await expect(stream.pull()).rejects.toThrow(ChannelClosedAlreadyException)
  })

  test("should reject all pending pulls after closing", async () => {
    // given
    const stream = new Stream<string>()

    // when
    const pull = stream.pull()
    await stream.close()

    // then
    await expect(pull).rejects.toThrow(ChannelWasClosedException)
  })

  test("should reject all pending sync pushes after closing", async () => {
    // given
    const stream = new Stream<string>()

    // when
    const push = stream.push("test")
    await stream.close()

    // then
    await expect(push).rejects.toThrow(ChannelWasClosedException)
  })

  test("should manually reject message", async () => {
    // given
    const stream = new Stream<string>()
    const push = stream.push("test")

    // when
    const message = await stream.pull()
    message.reject(new Error("test"))

    // then
    await expect(push).rejects.toThrow("test")
  })

  test("should rollback a message and pull it again", async () => {
    // given
    const stream = new Stream<string>()
    ;["A", "B", "C", "D"].forEach(message => stream.push(message))

    // when
    const messageA = await stream.pull()
    const messageB = await stream.pull()
    const messageC = await stream.pull()

    // then
    expect(messageA.value).toBe("A")
    expect(messageB.value).toBe("B")
    expect(messageC.value).toBe("C")

    // when
    messageB.rollback()

    // then
    const messageB2 = await stream.pull()
    expect(messageB2.value).toBe("B")

    // when
    messageA.rollback()
    messageC.rollback()

    // then
    const messageA2 = await stream.pull()
    const messageC2 = await stream.pull()

    expect(messageA2.value).toBe("A")
    expect(messageC2.value).toBe("C")
  })

  test("should only commit or rollback once", async () => {
    // given
    const stream = new Stream<string>()
    ;["A", "B", "C", "D"].forEach(message => stream.push(message))

    // when
    const messageA = await stream.pull()
    messageA.commit()

    // then
    expect(() => messageA.commit()).toThrow("Committed already.")
    expect(() => messageA.rollback()).toThrow("Committed already.")

    // when
    const messageB = await stream.pull()
    messageB.rollback()

    // then
    expect(() => messageB.commit()).toThrow("Rollback already.")
    expect(() => messageB.rollback()).toThrow("Rollback already.")
  })

  test("should pipe messages from one stream to another", async () => {
    // given
    const streamA = new Stream<string>()
    const streamB = new Stream<string>()

    // when
    streamA.pipe(streamB)

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

    // when
    streamA.pipe(streamB)
    streamA.pipe(streamC)

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

    // when
    streamA.pipe(streamB)
    const messages = ["A", "B"]
    messages.forEach(message => streamA.push(message))

    // then
    const outputStream = messages.map(() => autoCommit(streamB.pull()))
    expect(
      (await Promise.all(outputStream)).map(message => message.value),
    ).toEqual(messages)

    // when
    streamA.unpipe(streamB)
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

    // when
    streamA.pipe(streamB)
    streamA.pipe(streamC)

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
    streamA.unpipeAll()
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
