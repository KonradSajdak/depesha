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
})
