import { beforeEach, describe, expect, test } from "vitest"
import { Transmission, Transport } from "../transport"
import { withMemoryTransport } from "."

describe("MemoryTransport", () => {
  let transport: Transport

  beforeEach(() => {
    transport = withMemoryTransport()
  })

  test.skip("should send and receive messages (default sync)", async () => {
    // given
    const producer = transport.producer()
    const consumer = transport.consumer()

    // when
    const promise = producer.send({ payload: "Hello, World!" })

    // then
    await expect(promise).not.resolves.toEqual(expect.anything())

    const received = await consumer.receive()
    expect(received.value.getBody()).toEqual({ payload: "Hello, World!" })

    // and
    await expect(promise).resolves.toEqual(expect.anything())
  })

  test("should send async and receive messages", async () => {
    // given
    const producer = transport.producer()
    const consumer = transport.consumer()

    // when
    await producer.send({
      body: { payload: "Hello, World!" },
      headers: {
        transmission: Transmission.ASYNC,
      },
    })

    // then
    const received = await consumer.receive()
    expect(received.value.getBody()).toEqual({ payload: "Hello, World!" })
  })
})
