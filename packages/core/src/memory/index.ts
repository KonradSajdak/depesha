import { InMemoryOptions, InMemoryTransport } from "./transport"

export function withMemoryTransport(options?: InMemoryOptions) {
  return new InMemoryTransport(options)
}
