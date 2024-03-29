import { MessageConstruction } from "./message"

export enum Transmission {
  SYNC = "sync",
  ASYNC = "async",
}

export interface ProducerOptions {
  defaultTransmission?: Transmission
}

export interface ConsumerOptions {
  groupId?: string
}

export interface Producer {
  send<T>(message: MessageConstruction<T>): Promise<T | void>
}

export interface Receiver {
  receive<T>(channel?: string): Promise<MessageConstruction<T>>
}

export interface Subscriber {
  subscribe<T>(
    callback: (message: MessageConstruction<T>) => void,
    channel?: string,
  ): () => void
}

export interface Consumer extends Receiver, Subscriber {}

export interface Transport {
  producer(options?: ProducerOptions, ...args: unknown[]): Producer
  consumer(options?: ConsumerOptions, ...args: unknown[]): Consumer
}
