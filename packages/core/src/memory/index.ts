import { InMemoryTransport } from "./transport"

export function withMemoryTransport() {
  return new InMemoryTransport()
}
