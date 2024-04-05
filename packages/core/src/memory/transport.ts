import { Message, MessageConstruction } from "../message"
import {
  Consumer,
  ConsumerOptions,
  ConsumingOptions,
  Producer,
  ProducerOptions,
  Transmission,
  Transport,
} from "../transport"
import { Channel } from "../channel"
import { StreamConsumer } from "../stream"

const DEFAULT_CHANNEL = Symbol("IN_MEMORY_TRANSPORT_DEFAULT_CHANNEL")

export class InMemoryTransport implements Transport {
  private readonly channels: Map<PropertyKey, Channel<Message>> = new Map([
    [DEFAULT_CHANNEL, new Channel<Message>()],
  ])

  private channel(channel?: string) {
    if (!channel) return this.channels.get(DEFAULT_CHANNEL)!

    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Channel<Message>())
    }

    return this.channels.get(channel)!
  }

  public producer(options?: ProducerOptions): Producer {
    return {
      send: async <T>(construction: MessageConstruction) => {
        const message = Message.createFromConstruction(construction)
        const transmission =
          message.getHeader("transmission") ??
          options?.defaultTransmission ??
          Transmission.SYNC

        const partition = message.getHeader("partition")

        const channel = this.channel(message.getHeader("channel"))

        if (transmission === Transmission.ASYNC) {
          channel.push(message, { partition })
          return
        }

        return channel.push(message, { partition }) as T
      },
    }
  }

  public consumer(options?: ConsumerOptions): Consumer {
    const defaultGroup = "default-group"
    const defaultChannel = "default-channel"

    const defaultConsumer = `${defaultChannel}:${defaultGroup}`

    const consumers: Map<PropertyKey, StreamConsumer<Message>> = new Map([
      [defaultConsumer, this.channel().consume()],
    ])

    const consumeFrom = (options?: ConsumingOptions) => {
      const channel = options?.channel ?? defaultChannel
      const groupId = options?.groupId ?? defaultGroup

      const consumingKey = `${channel}:${groupId}`

      if (!options?.channel && !options?.groupId)
        return consumers.get(defaultConsumer)!

      if (!consumers.has(consumingKey)) {
        consumers.set(consumingKey, this.channel(channel).consume({ groupId }))
      }

      return consumers.get(consumingKey)!
    }

    return {
      receive: async <T>(options?: ConsumingOptions) => {
        const message = await consumeFrom(options).pull()
        return message.value.toConstruction() as MessageConstruction<T>
      },

      subscribe: <T>(
        callback: (message: MessageConstruction<T>) => void,
        options?: ConsumingOptions,
      ) => {
        let unsubscribed = false

        const waitForNextMessage = async () => {
          const message = await consumeFrom(options).pull()
          if (unsubscribed) return

          callback(message.value.toConstruction() as MessageConstruction<T>)
          await waitForNextMessage()
        }

        waitForNextMessage()

        return () => {
          unsubscribed = true
        }
      },
    }
  }

  public async close() {
    await Promise.allSettled(
      Array.from(this.channels.values()).map(channel => channel.close()),
    )
    this.channels.clear()
  }

  public async inspect() {
    return {
      channels: this.channels.size,
    }
  }
}
