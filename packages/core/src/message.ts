// https://www.enterpriseintegrationpatterns.com/patterns/messaging/MessageConstructionIntro.html
import { randomUUID } from "./utils/random-uuid"
import { Transmission } from "./transport"

export interface MessageHeaders {
  messageId: string
  channel: string
  partition: number
  transmission: Transmission
}

export type MessageRaw<
  TBody = unknown,
  THeaders extends Partial<MessageHeaders> = Partial<MessageHeaders>,
> = {
  body: TBody
  headers?: THeaders
}

export type MessageConstruction<
  TBody = unknown,
  THeaders extends Partial<MessageHeaders> = Partial<MessageHeaders>,
> = MessageRaw<TBody, THeaders> | TBody

export class Message<
  TBody = unknown,
  THeaders extends Partial<MessageHeaders> = Partial<MessageHeaders>,
> {
  private readonly id: string

  private constructor(
    private readonly body: TBody,
    private readonly headers: THeaders = {} as THeaders,
  ) {
    this.id = headers.messageId ?? randomUUID()
  }

  public toRaw(): MessageRaw<TBody, THeaders> {
    return {
      body: this.body,
      headers: this.headers,
    }
  }

  public getBody(): TBody {
    return this.body
  }

  public getHeader<T extends keyof THeaders>(key: T): THeaders[T] {
    return this.headers[key]
  }

  public static createNew<
    TBody = unknown,
    THeaders extends Partial<MessageHeaders> = Partial<MessageHeaders>,
  >(body: TBody, headers?: THeaders): Message<TBody, THeaders> {
    return new Message(body, headers)
  }

  public static createFromConstruction<
    TBody = unknown,
    THeaders extends Partial<MessageHeaders> = Partial<MessageHeaders>,
  >(message: MessageConstruction<TBody, THeaders>): Message<TBody, THeaders> {
    const body =
      message && typeof message === "object" && "body" in message
        ? message.body
        : message
    const headers =
      message && typeof message === "object" && "body" in message
        ? message.headers
        : undefined

    return new Message(body, headers)
  }
}
