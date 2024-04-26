import {
  GatewayChannelsConfiguration,
  GatewayChannelsWithTransportsConfiguration,
  GatewayConfiguration,
  GatewayTransportsConfiguration,
} from "./gateway"
import { Consumer, Producer, Transport, isTransport } from "./transport"

export interface UserGatewayConfiguration {
  transports: GatewayTransportsConfiguration
  channels: GatewayChannelsWithTransportsConfiguration
}

export interface UserChannelsConfiguration {
  channels: GatewayChannelsConfiguration
}

const isUserChannelsConfiguration = (
  value: unknown,
): value is UserChannelsConfiguration => {
  return (
    typeof value === "object" &&
    value !== null &&
    "channels" in value &&
    !("transports" in value)
  )
}

const isUserGatewayConfiguration = (
  value: unknown,
): value is UserGatewayConfiguration => {
  return (
    typeof value === "object" &&
    value !== null &&
    "transports" in value &&
    "channels" in value
  )
}

export function toGatewayConfiguration(
  configuration:
    | Transport
    | [Producer, Consumer]
    | UserChannelsConfiguration
    | UserGatewayConfiguration,
): GatewayConfiguration {
  if (isTransport(configuration)) {
    return {
      transports: {
        default: configuration,
      },
      channels: {
        default: "default",
      },
    }
  }

  if (isUserChannelsConfiguration(configuration)) {
    return {
      transports: configuration.channels,
      channels: Object.keys(configuration.channels).reduce(
        (acc, channelName) => ({ ...acc, [channelName]: channelName }),
        {},
      ),
    }
  }

  if (isUserGatewayConfiguration(configuration)) {
    const [channels, transports] = Object.entries(
      configuration.channels,
    ).reduce(
      ([channels, transports], [channelName, transport]) => {
        if (typeof transport === "string") {
          return [{ ...channels, [channelName]: transport }, transports]
        }

        return [
          { ...channels, [channelName]: `${channelName}__transport` },
          { ...transports, [`${channelName}__transport`]: transport },
        ]
      },
      [{}, {}],
    )

    return {
      transports: {
        ...configuration.transports,
        ...transports,
      },
      channels,
    }
  }

  return {
    transports: {
      default: configuration,
    },
    channels: {
      default: "default",
    },
  }
}
