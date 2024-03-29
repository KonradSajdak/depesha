import { Message, MessageConstruction } from "../message"
import {
  Consumer,
  ConsumerOptions,
  Producer,
  ProducerOptions,
  Transmission,
  Transport,
} from "../transport"
import { Channel } from "./channel"
import { StreamConsumer } from "./stream"

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

        const channel = this.channel(message.getHeader("channel"))

        if (transmission === Transmission.ASYNC) {
          channel.push(message)
          return
        }

        return channel.push(message) as T
      },
    }
  }

  public consumer(options?: ConsumerOptions): Consumer {
    const consumers: Map<PropertyKey, StreamConsumer<Message>> = new Map([
      [DEFAULT_CHANNEL, this.channel().consume()],
    ])

    const consumeFrom = (channel?: string) => {
      if (!channel) return consumers.get(DEFAULT_CHANNEL)!

      if (!consumers.has(channel)) {
        consumers.set(channel, this.channel(channel).consume())
      }

      return consumers.get(channel)!
    }

    return {
      receive: async <T>(channel?: string) => {
        const message = await consumeFrom(channel).pull()
        return message.value.toConstruction() as MessageConstruction<T>
      },

      subscribe: <T>(
        callback: (message: MessageConstruction<T>) => void,
        channel?: string,
      ) => {
        let unsubscribed = false

        const waitForNextMessage = async () => {
          const message = await consumeFrom(channel).pull()
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
