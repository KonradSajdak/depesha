import { MessageConstruction } from "../message"
import { Consumer, Producer, Transport } from "../transport"

export class InMemoryTransport implements Transport {
  public producer(config: { topic: string }): Producer {
    return {
      send: async <T>(message: MessageConstruction) => {
        return {} as T
      },
    }
  }

  public consumer(): Consumer {
    return {
      receive: async <T>() => {
        return {} as MessageConstruction<T>
      },

      subscribe: <T>(callback: (message: MessageConstruction<T>) => void) => {
        return () => {}
      },
    }
  }
}
