import { test, expect, describe } from "vitest"
import { Stream } from "./stream"
import {
  ChannelClosedAlreadyException,
  ChannelWasClosedException,
} from "./exception"

describe("Stream", () => {
  test("should push a message", async () => {
    // given
    const stream = new Stream<string>()

    // when
    stream.push("test")

    // then
    const result = await stream.pull()
    expect(result).toBe("test")
  })

  test("should pull a message", async () => {
    // given
    const stream = new Stream<string>()

    // then
    const result = stream.pull()

    // when
    stream.push("test")

    // then
    await expect(result).resolves.toBe("test")
  })

  test("should pull a stream after pushing", async () => {
    // given
    const stream = new Stream<string>()
    const inputStream = ["A", "B", "C", "D"]

    // when
    inputStream.forEach(message => stream.push(message))

    // then
    const outputStream = inputStream.map(() => stream.pull())
    expect(await Promise.all(outputStream)).toEqual(inputStream)
  })

  test("should wait for stream when pulling before push", async () => {
    // given
    const stream = new Stream<string>()
    const inputStream = ["A", "B", "C", "D"]

    // when
    const outputStream = inputStream.map(() => stream.pull())
    inputStream.forEach(message => stream.push(message))

    // then
    expect(await Promise.all(outputStream)).toEqual(inputStream)
  })

  test("should close the stream", async () => {
    // given
    const stream = new Stream<string>()
    const inputStream = ["A", "B", "C", "D"]

    // when
    const pushes = inputStream.map(message => stream.push(message))

    // then
    expect(stream.stats()).toEqual({ pushes: 4, pulls: 0 })

    // when
    await stream.close()

    // then
    expect(Promise.all(pushes)).rejects.toThrow(ChannelWasClosedException)
    expect(stream.stats()).toEqual({ pushes: 0, pulls: 0 })
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

  test("should reject all pending pushes after closing", async () => {
    // given
    const stream = new Stream<string>()

    // when
    const push = stream.push("test")
    await stream.close()

    // then
    await expect(push).rejects.toThrow(ChannelWasClosedException)
  })
})
