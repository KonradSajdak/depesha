import { MessageConstruction } from "./message"

export interface Producer {
  send<T>(message: MessageConstruction): Promise<T>
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
  producer(...args: unknown[]): Producer
  consumer(...args: unknown[]): Consumer
}
