import { Message, MessageConstruction, MessageRaw } from "./message"
import { PendingMessage } from "./stream"

export enum Transmission {
  SYNC = "sync",
  ASYNC = "async",
}

export type BaseTransportOptions = Record<PropertyKey, any>

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
  receive<T>(options?: ConsumingOptions): Promise<PendingMessage<Message<T>>>
}

export interface Subscriber {
  subscribe<T>(
    callback: (message: MessageRaw<T>) => void,
    options?: ConsumingOptions,
  ): () => void
}

export interface Consumer extends Receiver, Subscriber {}

export interface Transport<
  TransportProducerOptions extends ProducerOptions = ProducerOptions,
  TransportConsumerOptions extends ConsumerOptions = ConsumerOptions,
> {
  producer(options?: TransportProducerOptions): Producer
  consumer(options?: TransportConsumerOptions): Consumer
}

export const isTransport = (value: unknown): value is Transport => {
  return (
    typeof value === "object" &&
    typeof (value as Transport).producer === "function" &&
    typeof (value as Transport).consumer === "function"
  )
}
