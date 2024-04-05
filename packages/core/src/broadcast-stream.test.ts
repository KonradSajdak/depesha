import { describe, expect, test } from "vitest"
import { BroadcastStream } from "./broadcast-stream"
import {
  ChannelClosedAlreadyException,
  ChannelWasClosedException,
} from "./exception"

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
    const outputStreamA = inputStream.map(() => consumerA.pull())
    expect(
      (await Promise.all(outputStreamA)).map(message => message.value),
    ).toEqual(inputStream)

    const outputStreamB = inputStream.map(() => consumerB.pull())
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
