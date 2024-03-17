import { describe, expect, test } from "vitest"
import { Channel } from "./channel"

describe("Channel", () => {
  test("should consume a stream concurrently", async () => {
    // given
    const channel = new Channel<string>()
    const inputStream = ["A", "B", "C", "D"]

    const consumerA = channel.consume()
    const consumerB = channel.consume()

    // when
    inputStream.forEach(message => channel.push(message))

    // then
    const outputStreamA = inputStream.map(() => consumerA.pull())
    expect(await Promise.all(outputStreamA)).toEqual(inputStream)

    const outputStreamB = inputStream.map(() => consumerB.pull())
    expect(await Promise.all(outputStreamB)).toEqual(inputStream)
  })

  test("should buffer pushing messages when any consumer registered", async () => {
    // given
    const channel = new Channel<string>()
    const inputStream = ["A", "B", "C", "D"]

    // when
    inputStream.forEach(message => channel.push(message))

    // then
    const consumer = channel.consume()
    const outputStream = inputStream.map(() => consumer.pull())
    expect(await Promise.all(outputStream)).toEqual(inputStream)
  })

  test("should close the channel", async () => {
    // given
    const channel = new Channel<string>()
    const inputStream = ["A", "B", "C", "D"]

    const consumer = channel.consume()

    // when
    const pushes = inputStream.map(message => channel.push(message))

    // then
    expect(channel.stats()).toEqual({ buffer: 0, consumers: 1 })

    // when
    channel.close()

    // then
    expect(consumer.pull()).rejects.toThrowError("Stream is closed")
    expect(Promise.all(pushes)).rejects.toThrowError("Stream was closed")
    expect(channel.stats()).toEqual({ buffer: 0, consumers: 0 })
  })
})
