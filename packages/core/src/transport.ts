import { Message, MessageConstruction, MessageRaw } from "./message"
import { PendingMessage } from "./stream"

export enum Transmission {
  SYNC = "sync",
  ASYNC = "async",
}

export type BaseTransportOptions = Record<PropertyKey, any>

export interface ProducerOptions<
  TransportOptions extends BaseTransportOptions,
> {
  defaultTransmission?: Transmission
  transportOptions?: TransportOptions
}

export interface ConsumerOptions<
  TransportOptions extends BaseTransportOptions,
> {
  defaultChannel?: string
  defaultGroupId?: string
  transportOptions?: TransportOptions
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
  ): Promise<PendingMessage<Message<T>>>
}

export interface Subscriber {
  subscribe<T>(
    callback: (message: MessageRaw<T>) => void,
    options?: Partial<ConsumingOptions>,
  ): () => void
}

export interface Consumer extends Receiver, Subscriber {}

export interface Transport<
  ProducerTransportOptions extends BaseTransportOptions,
  ConsumerTransportOptions extends BaseTransportOptions,
> {
  producer(options?: ProducerOptions<ProducerTransportOptions>): Producer
  consumer(options?: ConsumerOptions<ConsumerTransportOptions>): Consumer
}
