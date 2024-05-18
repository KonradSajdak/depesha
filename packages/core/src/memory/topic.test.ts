import { describe, expect, test } from "vitest"
import { Topic, calculatePartitionConsumer } from "./topic"
import { expectMessagesFrom } from "../utils/expect-messages"

describe("Partitioning messages", () => {
  test.each([
    // [partitionNumber, totalConsumers, expectedConsumerNumber]
    [1, 1, 1],
    [1, 2, 1],
    [1, 1, 1],
    [1, 2, 1],
    [2, 2, 2],
    [3, 2, 1],
    [4, 2, 2],
    [5, 2, 1],
    [6, 2, 2],
    [7, 0, 0],
  ])(
    `partition no. %i with %i consumers should be consumed by consumer no. %i`,
    (partitionNumber, totalConsumers, expectedConsumerNumber) => {
      const consumerNumber = calculatePartitionConsumer(
        partitionNumber,
        totalConsumers,
      )
      expect(consumerNumber).toBe(expectedConsumerNumber)
    },
  )
})

describe("Topic", () => {
  const messages = ["A", "B", "C", "D"]
  const createTopic = () => new Topic<string>()

  test("should be able to push messages to consumers", async () => {
    // given
    const topic = createTopic()
    const consumer = topic.consume()

    // when
    messages.forEach(message => topic.push(message))

    // then
    expectMessagesFrom(consumer, messages)
  })

  test("should be able to consume messages after pushing", async () => {
    // given
    const topic = createTopic()
    messages.forEach(message => topic.push(message))

    // when
    const consumer = topic.consume()

    // then
    expectMessagesFrom(consumer, messages)
  })

  test("should be able to push single partition only to single consumer", async () => {
    // given
    const topic = createTopic()
    const consumer1 = topic.consume({ groupId: "A" })
    const consumer2 = topic.consume({ groupId: "A" })

    // when
    messages.forEach(message => topic.push(message))

    // then
    expectMessagesFrom(consumer1, messages)

    expect(consumer2.pull({ signal: AbortSignal.timeout(1) })).rejects.toThrow(
      "The operation was aborted due to timeout",
    )
  })

  test("should be able to push multiple partitions to multiple consumers", async () => {
    // given
    const topic = createTopic()
    const consumer1 = topic.consume({ groupId: "A" })
    const consumer2 = topic.consume({ groupId: "A" })

    // when
    messages.forEach((message, index) =>
      topic.push(message, { partition: index % 2 }),
    )

    // then
    expectMessagesFrom(consumer1, [messages[0], messages[2]])
    expectMessagesFrom(consumer2, [messages[1], messages[3]])
  })

  test("should be able to push multiple partitions to single consumer", async () => {
    // given
    const topic = createTopic()
    const consumer = topic.consume()

    // when
    messages.forEach((message, index) =>
      topic.push(message, { partition: index % 2 }),
    )

    // then
    expectMessagesFrom(consumer, messages)
  })

  test("should be able to push single partitions to multiple consumers when in different groups", async () => {
    // given
    const topic = createTopic()
    const consumer1 = topic.consume({ groupId: "A" })
    const consumer2 = topic.consume({ groupId: "B" })

    // when
    messages.forEach(message => topic.push(message))

    // then
    expectMessagesFrom(consumer1, messages)
    expectMessagesFrom(consumer2, messages)
  })

  test("should be able to push multiple partitions to multiple consumers when in different groups", async () => {
    // given
    const topic = createTopic()
    const consumerA1 = topic.consume({ groupId: "A" })
    const consumerA2 = topic.consume({ groupId: "A" })
    const consumerB1 = topic.consume({ groupId: "B" })
    const consumerB2 = topic.consume({ groupId: "B" })

    // when
    messages.forEach((message, index) =>
      topic.push(message, { partition: index % 2 }),
    )

    // then
    expectMessagesFrom(consumerA1, [messages[0], messages[2]])
    expectMessagesFrom(consumerA2, [messages[1], messages[3]])
    expectMessagesFrom(consumerB1, [messages[0], messages[2]])
    expectMessagesFrom(consumerB2, [messages[1], messages[3]])
  })
})
