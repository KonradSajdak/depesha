import { UserChannelsConfiguration, UserGatewayConfiguration, toGatewayConfiguration } from "./gateway-configuration"
import { Message, MessageConstruction, MessageRaw } from "./message"
import { PendingMessage } from "./stream"
import {
  Consumer,
  ConsumingOptions,
  Producer,
  Transport
} from "./transport"

export type ChannelName = string
export type TransportName = string

export type GatewayTransportDefinition = Transport | [Producer, Consumer]

export type GatewayChannelsConfiguration = Record<
  ChannelName,
  GatewayTransportDefinition
>

export type GatewayChannelsWithTransportsConfiguration = Record<
  ChannelName,
  GatewayTransportDefinition | TransportName
>

export type GatewayTransportsConfiguration = Record<
  TransportName,
  GatewayTransportDefinition
>

export interface GatewayConfiguration {
  transports: GatewayTransportsConfiguration
  channels: Record<ChannelName, TransportName>
}

export class Gateway implements Producer, Consumer {
  private transports: Map<TransportName, [Producer, Consumer]> = new Map()
  private channels: Map<ChannelName, TransportName> = new Map()

  public constructor(configuration: GatewayConfiguration) {
    for (const [transportName, transport] of Object.entries(
      configuration.transports,
    )) {
      if (Array.isArray(transport)) {
        this.transports.set(transportName, transport)
        continue
      }

      this.transports.set(transportName, [transport.producer(), transport.consumer()])
    }

    for (const [channelName, transportName] of Object.entries(
      configuration.channels,
    )) {
      if (this.transports.has(transportName)) {
        this.channels.set(channelName, transportName)
        continue
      }

      throw new Error(`Transport "${transportName}" not found`)
    }
  }

  public send<T>(construction: MessageConstruction<T>): Promise<T | void> {
    const message = Message.createFromConstruction(construction)
    const [producer] = this.getTransportForChannel(
      message.getHeader("channel") ?? "default",
    )

    return producer.send(construction)
  }

  public async receive<T>(
    options?: ConsumingOptions,
  ): Promise<PendingMessage<Message<T>>> {
    const [, consumer] = this.getTransportForChannel(
      options?.channel ?? "default",
    )

    return consumer.receive(options)
  }

  public subscribe<T>(
    callback: (message: MessageRaw<T>) => void,
    options?: ConsumingOptions,
  ): () => void {
    const [, consumer] = this.getTransportForChannel(
      options?.channel ?? "default",
    )

    return consumer.subscribe(callback, options)
  }

  private getTransport(transportName: TransportName): [Producer, Consumer] {
    const transport = this.transports.get(transportName)

    if (!transport) {
      throw new Error(`Transport "${transportName}" not found`)
    }

    return transport
  }

  private getTransportForChannel(
    channelName: ChannelName,
  ): [Producer, Consumer] {
    const transportName = this.channels.get(channelName)

    if (!transportName) {
      throw new Error(`Channel "${channelName}" not found`)
    }

    return this.getTransport(transportName)
  }
}

export function createGateway(configuration: Transport): Gateway
export function createGateway(configuration: [Producer, Consumer]): Gateway
export function createGateway(configuration: UserChannelsConfiguration): Gateway
export function createGateway(configuration: UserGatewayConfiguration): Gateway
export function createGateway(
  configuration:
    | Transport
    | [Producer, Consumer]
    | UserChannelsConfiguration
    | UserGatewayConfiguration,
): Gateway {
  return new Gateway(toGatewayConfiguration(configuration))
}