import { describe, expect, test } from "vitest"
import { BroadcastStream } from "./broadcast-stream"
import {
  ChannelClosedAlreadyException,
  ChannelWasClosedException,
} from "./exception"
import { autoCommit } from "./auto-commit"
import { StreamConsumer } from "./stream"

const expectMessages = async <T>(
  consumer: StreamConsumer<T>,
  messages: T[],
) => {
  const outputStream = messages.map(() => autoCommit(consumer.pull()))
  return expect(
    (await Promise.all(outputStream)).map(message => message.value),
  ).toEqual(messages)
}

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
    await expectMessages(consumerA, inputStream)
    await expectMessages(consumerB, inputStream)
  })

  test("should buffer pushing messages when any consumer registered", async () => {
    // given
    const channel = new BroadcastStream<string>()
    const inputStream = ["A", "B", "C", "D"]

    // when
    inputStream.forEach(message => channel.push(message))

    // then
    const consumer = channel.consume()
    await expectMessages(consumer, inputStream)
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

  test("should push buffered messages only to the new consumer", async () => {
    // given
    const channel = new BroadcastStream<string>()
    const inputStream1st = ["A", "B", "C", "D"]
    const inputStream2nd = ["E"]

    // when
    inputStream1st.forEach(message => channel.push(message))

    // then
    const consumerA = channel.consume()
    await expectMessages(consumerA, inputStream1st)

    // when
    const consumerB = channel.consume()
    inputStream2nd.forEach(message => channel.push(message))

    // then
    await expectMessages(consumerB, inputStream1st)
    await expectMessages(consumerA, inputStream2nd)
  })
})
