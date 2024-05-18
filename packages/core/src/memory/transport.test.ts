import { beforeEach, describe, expect, test, vi } from "vitest"
import { Transmission, Transport, Producer } from "../transport"
import { withMemoryTransport } from "."
import { Message, MessageHeaders } from "../message"
import { PendingMessage } from "../stream"
import { expectMessages as expectRawMessages } from "../utils/expect-messages"

const sendAllUsing = <T>(
  producer: Producer,
  messages: T[],
  options?: Partial<MessageHeaders> & {
    partitionFactory?: (index: number) => number
  },
) => {
  return Promise.all(
    messages.map((body, index) => {
      const { partitionFactory, ...headers } = options || {}

      if (partitionFactory) {
        headers.partition = partitionFactory(index)
      }

      return producer.send({ body, headers })
    }),
  )
}

const expectMessages = async <T>(
  pendings: Promise<PendingMessage<Message<T, Partial<MessageHeaders>>>>[],
  messages: T[],
) =>
  expectRawMessages(pendings, messages, {
    mapper: message => message.getBody(),
  })

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

  test("should consume a stream sequentially (default)", async () => {
    // given
    const producer = transport.producer()
    const consumer = transport.consumer()

    const stream = ["A", "B", "C", "D"]

    // when
    await sendAllUsing(producer, stream, {
      transmission: Transmission.ASYNC,
    })

    // then
    expectMessages(
      [
        consumer.receive(),
        consumer.receive(),
        consumer.receive(),
        consumer.receive(),
      ],
      stream,
    )
  })

  test("should consume a stream concurrently", async () => {
    // given
    const producer = transport.producer()
    const consumer = transport.consumer()

    const stream = ["A", "B"]

    // when
    await sendAllUsing(producer, stream, {
      transmission: Transmission.ASYNC,
    })

    // then
    expectMessages(
      [
        consumer.receive({ groupId: "1A" }),
        consumer.receive({ groupId: "2B" }),
        consumer.receive({ groupId: "2B" }),
        consumer.receive({ groupId: "1A" }),
      ],
      ["A", "A", "B", "B"],
    )
  })

  test("should consume a stream concurrently as group with partitions", async () => {
    // given
    const producer = transport.producer()
    const consumerA = transport.consumer()
    const consumerB = transport.consumer()

    const stream = ["A", "B", "C", "D", "E"]

    // when
    await sendAllUsing(producer, stream, {
      transmission: Transmission.ASYNC,
      partitionFactory: index => index % 2,
    })

    // then
    expectMessages(
      [
        consumerA.receive({ groupId: "1A" }),
        consumerA.receive({ groupId: "1A" }),
        consumerA.receive({ groupId: "1A" }),
      ],
      ["A", "C", "E"],
    )

    expectMessages(
      [
        consumerB.receive({ groupId: "1A" }),
        consumerB.receive({ groupId: "1A" }),
      ],
      ["B", "D"],
    )
  })
})
