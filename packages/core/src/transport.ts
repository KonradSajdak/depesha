import { Message, MessageConstruction, MessageRaw } from "./message"
import { Pending } from "./stream"

export enum Transmission {
  SYNC = "sync",
  ASYNC = "async",
}

export interface ProducerOptions {
  defaultTransmission?: Transmission
}

export interface ConsumerOptions {
  defaultChannel?: string
  defaultGroupId?: string
}

export interface ConsumingOptions {
  channel?: string
  groupId?: string
}

export interface Producer {
  send<T>(message: MessageConstruction<T>): Promise<T | void>
}

export interface Receiver {
  receive<T>(
    options?: Partial<ConsumingOptions>,
  ): Promise<Pending<Message<T>>>
}

export interface Subscriber {
  subscribe<T>(
    callback: (message: MessageRaw<T>) => void,
    options?: Partial<ConsumingOptions>,
  ): () => void
}

export interface Consumer extends Receiver, Subscriber {}

export interface Transport {
  producer(options?: ProducerOptions, ...args: unknown[]): Producer
  consumer(options?: ConsumerOptions, ...args: unknown[]): Consumer
}
