// https://www.enterpriseintegrationpatterns.com/patterns/messaging/MessageConstructionIntro.html
import { randomUUID } from "node:crypto"

export interface AvailableMessageHeaders {
  messageId: string
  viaChannel: string
}

export type MessageConstruction<
  TBody = unknown,
  THeaders extends
    Partial<AvailableMessageHeaders> = Partial<AvailableMessageHeaders>,
> =
  | {
      body: TBody
      headers?: THeaders
    }
  | TBody

export class Message<
  TBody = unknown,
  THeaders extends
    Partial<AvailableMessageHeaders> = Partial<AvailableMessageHeaders>,
> {
  private readonly id: string

  private constructor(
    private readonly body: TBody,
    private readonly headers: THeaders = {} as THeaders,
  ) {
    this.id = headers.messageId ?? randomUUID()
  }

  public static createNew<
    TBody = unknown,
    THeaders extends
      Partial<AvailableMessageHeaders> = Partial<AvailableMessageHeaders>,
  >(body: TBody, headers?: THeaders): Message<TBody, THeaders> {
    return new Message(body, headers)
  }
}
