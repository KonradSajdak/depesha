// https://www.enterpriseintegrationpatterns.com/patterns/messaging/MessagingGateway.html

import { ChannelsMapping } from "./channel"
import { Message } from "./message"

type GatewayConfiguration = {
  channels: ChannelsMapping
  routing: Record<string, any>
}

export class Gateway {
  public async send<T>(message: Message<T>): Promise<void> {}
  public async receive<T>(): Promise<Message> {
    return { headers: {}, body: {} }
  }
}

export const configureGateway = (config?: Partial<GatewayConfiguration>) => {
  return new Gateway()
}
