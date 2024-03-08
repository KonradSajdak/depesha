import { withMemoryTransport } from "./memory"
import { MessageConstruction } from "./message"
import { Consumer, Producer, Transport } from "./transport"

// const ENV = {}

// const fromEnv = (env: Record<string, string>) => {
//   return {
//     adapter: publishSubscribe(),
//     handleMessage: async (message: Record<string, unknown>) => {},
//   }
// }

// const { adapter, handleMessage } = fromEnv(ENV)
// const gateway = depesha({
//   channels: {
//     orders: adapter,
//   },
// })

// handleMessage({})

const transport = withMemoryTransport()

const producer = transport.producer({ topic: "shipping" })
const consumer = transport.consumer()

const gateway = (config: any) => {}

const x = gateway({
  channels: {
    orders: transport,
    shipping: [producer, consumer],
    "warehouse-request": [producer, consumer],
    "warehouse-replay": [producer, consumer],
  },
})
