import { MessageConstruction } from "./message"

export interface Producer {
  send<T>(message: MessageConstruction): Promise<T>
}

export interface Consumer {
  receive<T>(channel?: string): Promise<MessageConstruction<T>>
  subscribe<T>(
    callback: (message: MessageConstruction<T>) => void,
    channel?: string,
  ): () => void
}

export interface Transport {
  producer(...args: unknown[]): Producer
  consumer(...args: unknown[]): Consumer
}
