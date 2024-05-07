import { beforeEach, describe, expect, test, vi } from "vitest"
import { Transmission, Transport } from "../transport"
import { withMemoryTransport } from "."

describe("MemoryTransport", () => {
  let transport: Transport

  beforeEach(() => {
    transport = withMemoryTransport()
  })

  test("should send and receive messages (default sync)", async () => {
    // given
    const producer = transport.producer()
    const consumer = transport.consumer()

    const checkpoint = vi.fn()

    // when
    const producing = producer
      .send({ payload: "Hello, World!" })
      .then(value => {
        checkpoint("send")
        return value
      })
    const received = consumer.receive().then(value => {
      checkpoint("receive")
      return value.commit()
    })

    // then
    await expect(producing).resolves.toEqual(expect.anything())
    await expect(received).resolves.toEqual(expect.anything())

    expect(checkpoint).nthCalledWith(1, "receive")
    expect(checkpoint).nthCalledWith(2, "send")
  })

  test("should send and receive messages (async)", async () => {
    // given
    const producer = transport.producer()
    const consumer = transport.consumer()

    const checkpoint = vi.fn()

    // when
    const producing = producer
      .send({
        body: { payload: "Hello, World!" },
        headers: {
          transmission: Transmission.ASYNC,
        },
      })
      .then(value => {
        checkpoint("send")
        return value
      })
    const received = consumer.receive().then(value => {
      checkpoint("receive")
      return value.commit()
    })

    // then
    await expect(producing).resolves.toEqual(expect.anything())
    await expect(received).resolves.toEqual(expect.anything())

    expect(checkpoint).nthCalledWith(1, "send")
    expect(checkpoint).nthCalledWith(2, "receive")
  })
})
