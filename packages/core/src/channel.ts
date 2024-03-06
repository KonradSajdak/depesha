export type ChannelTransport = string | Record<string, unknown>
export type ChannelName = string

export type Channel = {
  name: ChannelName
  transport: ChannelTransport
}

export type ChannelsMapping =
  | ChannelTransport
  | Record<ChannelName, ChannelTransport>
  | Channel[]
