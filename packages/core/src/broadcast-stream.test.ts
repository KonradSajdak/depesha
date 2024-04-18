import { describe, expect, test } from "vitest"
import { BroadcastStream } from "./broadcast-stream"
import {
  ChannelClosedAlreadyException,
  ChannelWasClosedException,
} from "./exception"
import { autoCommit } from "./auto-commit"
import { fromBroadcastStream } from "./pipe"

describe("BroadcastSteam", () => {
  test("should consume a stream concurrently", async () => {
    // given
    const channel = new BroadcastStream<string>()
    const inputStream = ["A", "B", "C", "D"]

    const consumerA = channel.consume()
    const consumerB = channel.consume()

    // when
    inputStream.forEach(message => channel.push(message))

    // then
    const outputStreamA = inputStream.map(() => autoCommit(consumerA.pull()))
    expect(
      (await Promise.all(outputStreamA)).map(message => message.value),
    ).toEqual(inputStream)

    const outputStreamB = inputStream.map(() => autoCommit(consumerB.pull()))
    expect(
      (await Promise.all(outputStreamB)).map(message => message.value),
    ).toEqual(inputStream)
  })

  test("should buffer pushing messages when any consumer registered", async () => {
    // given
    const channel = new BroadcastStream<string>()
    const inputStream = ["A", "B", "C", "D"]

    // when
    inputStream.forEach(message => channel.push(message))

    // then
    const consumer = channel.consume()
    const outputStream = inputStream.map(() => consumer.pull())
    expect(
      (await Promise.all(outputStream)).map(message => message.value),
    ).toEqual(inputStream)
  })

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
    const sinkA = fromBroadcastStream(streamA);

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

  test("should close the channel", async () => {
    // given
    const channel = new BroadcastStream<string>()
    const inputStream = ["A", "B", "C", "D"]

    const consumer = channel.consume()
    const groupConsumer = channel.consume()

    // when
    const pushes = inputStream.map(message => channel.push(message))

    // then
    expect(channel.inspect()).toEqual({
      buffer: 0,
      consumers: 2,
    })

    // when
    await channel.close()

    // then
    expect(consumer.pull()).rejects.toThrow(ChannelClosedAlreadyException)
    expect(groupConsumer.pull()).rejects.toThrow(ChannelClosedAlreadyException)
    expect(Promise.all(pushes)).rejects.toThrow(ChannelWasClosedException)
    expect(channel.inspect()).toEqual({
      buffer: 0,
      consumers: 0,
    })
  })
})
