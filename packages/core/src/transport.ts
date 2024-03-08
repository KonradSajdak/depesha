import { MessageConstruction } from "./message"

export interface Producer {
  send<T>(message: MessageConstruction): Promise<T>
}

export interface Consumer {
  receive<T>(): Promise<MessageConstruction<T>>
  subscribe<T>(callback: (message: MessageConstruction<T>) => void): () => void
}

export interface Transport {
  producer(...args: unknown[]): Producer
  consumer(...args: unknown[]): Consumer
}
