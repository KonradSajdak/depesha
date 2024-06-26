import { Message, MessageConstruction, MessageRaw } from "../message"
import {
  Consumer,
  ConsumerOptions,
  ConsumingOptions,
  Producer,
  ProducerOptions,
  Transmission,
  Transport,
} from "../transport"
import { Topic } from "./topic"
import { PendingMessage, StreamConsumer } from "./stream"
import { Mapper } from "./transformers/mapper"
import { Subscriber } from "./transformers/subscriber"
import { fromConsumer } from "./pipe"

const DEFAULT_CHANNEL = "default-channel"
const DEFAULT_GROUP = "default-group"

export interface InMemoryProducerOptions extends ProducerOptions {
  bufferLimit?: number
}

export interface InMemoryOptions {
  producer?: InMemoryProducerOptions
  consumer?: ConsumerOptions
}

export class InMemoryTransport implements Transport<InMemoryProducerOptions> {
  private readonly defaultProducerOptions: InMemoryProducerOptions
  private readonly defaultConsumerOptions: ConsumerOptions

  private readonly channels: Map<PropertyKey, Topic<Message>> = new Map()

  public constructor(options?: InMemoryOptions) {
    this.defaultProducerOptions = options?.producer ?? {}
    this.defaultConsumerOptions = options?.consumer ?? {}
  }

  private channel(channel: string = DEFAULT_CHANNEL) {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Topic<Message>())
    }

    return this.channels.get(channel)!
  }

  public producer(options?: InMemoryProducerOptions): Producer {
    return {
      send: <T>(construction: MessageConstruction<T>): Promise<T> => {
        const message = Message.createFromConstruction(construction)
        const transmission =
          message.getHeader("transmission") ??
          options?.defaultTransmission ??
          this.defaultProducerOptions?.defaultTransmission ??
          Transmission.SYNC

        const channelName =
          message.getHeader("channel") ??
          this.defaultProducerOptions?.defaultChannel

        const partition =
          message.getHeader("partition") ??
          this.defaultProducerOptions?.defaultPartition

        const channel = this.channel(channelName)

        if (transmission === Transmission.SYNC) {
          return channel
            .push(message, { partition })
            .then(() => message.getBody())
        }

        channel.push(message, { partition })
        return Promise.resolve(message.getBody())
      },
    }
  }

  public consumer(consumerOptions?: ConsumerOptions): Consumer {
    const consumers: Map<PropertyKey, StreamConsumer<Message>> = new Map()

    const consumeFrom = (options?: ConsumingOptions) => {
      const channel =
        options?.channel ??
        consumerOptions?.defaultChannel ??
        this.defaultConsumerOptions?.defaultChannel ??
        DEFAULT_CHANNEL
      const groupId =
        options?.groupId ??
        consumerOptions?.defaultGroupId ??
        this.defaultConsumerOptions?.defaultGroupId ??
        DEFAULT_GROUP

      const consumingKey = `${channel}:${groupId}`

      if (!consumers.has(consumingKey)) {
        consumers.set(consumingKey, this.channel(channel).consume({ groupId }))
      }

      return consumers.get(consumingKey)!
    }

    return {
      receive: async <T>(options?: ConsumingOptions) => {
        const consumer = consumeFrom(options)
        return (await consumer.pull()) as PendingMessage<Message<T>>
      },

      subscribe: <T>(
        callback: (message: MessageRaw<T>) => void,
        options?: ConsumingOptions,
      ) => {
        const consumer = consumeFrom(options)

        const flow = fromConsumer(consumer)
          .pipe(new Mapper((message: Message) => message.toRaw()))
          .pipe(new Subscriber(callback))

        return () => flow.destroy()
      },
    }
  }

  public async close() {
    await Promise.allSettled(
      Array.from(this.channels.values()).map(channel => channel.close()),
    )
    this.channels.clear()
  }

  public inspect() {
    return {
      channels: this.channels.size,
    }
  }
}
