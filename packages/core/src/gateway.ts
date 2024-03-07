// https://www.enterpriseintegrationpatterns.com/patterns/messaging/MessagingGateway.html

import { ChannelTransport, ChannelsMapping } from "./channel"
import { Message, MessageConstruction } from "./message"

type GatewayConfiguration = {
  channels: ChannelsMapping
  routing: Record<string, any>
}

export class Gateway {
  public async send<T>(message: MessageConstruction<T>): Promise<void> {}

  public async receive<T>(): Promise<Message<T>> {
    return Message.createNew({} as T)
  }
}

export function depesha(config?: Partial<GatewayConfiguration>): Gateway {
  return new Gateway()
}

// 2x pointToPoint (1x request channel, 1x replay channel)
export function requestReplay() {
  return new ChannelBuilder()
}

// 1x publishSubscribe + static ConsumerGroup
export function pointToPoint() {
  return new ChannelBuilder()
}

// with optional ConsumerGroup
export function publishSubscribe() {
  return new ChannelBuilder()
}

interface Sender {
  send<T>(message: Message<T>): Promise<void>
}

interface Receiver {
  receive<T>(): Promise<Message<T>>
}

interface Listener {
  listen<T>(callback: (message: Message<T>) => void): void
}

interface RemoteTransport {
  connect(): Promise<CloseConnection>
}

type CloseConnection = () => void

class RedisSender implements Sender, RemoteTransport {
  public async send<T>(message: Message<T>): Promise<void> {}
  public async connect(): Promise<CloseConnection> {
    return () => {}
  }
}

class RedisReceiver implements Receiver, RemoteTransport {
  public async receive<T>(): Promise<Message<T>> {
    return Message.createNew({} as T)
  }
  public async connect(): Promise<CloseConnection> {
    return () => {}
  }
}

class RedisListener implements Listener, RemoteTransport {
  public listen<T>(callback: (message: Message<T>) => void): void {}
  public async connect(): Promise<CloseConnection> {
    return () => {}
  }
}

class Sender {}
class Receiver {}
class Listener {}

class Transformer {}

function enrich() {
  return new Transformer()
}

function upcast() {
  return new Transformer()
}

class ChannelBuilder {
  public beforeSend(...transformers: Transformer[]) {
    return this
  }

  public afterReceive(...transformers: Transformer[]) {
    return this
  }

  public create(channelName: string): [Sender, Receiver, Listener] {
    return [new Sender(), new Receiver(), new Listener()]
  }
}

requestReplay().beforeSend(enrich()).afterReceive(upcast())

interface Channel {
  send<T>(message: Message<T>): Promise<void>
  receive<T>(): Promise<Message<T>>
}
