//ts-worksheet
import { withMemoryTransport } from "./memory"
import { MessageConstruction } from "./message"
import { Consumer, Producer, Transmission, Transport } from "./transport"

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

const producer = transport.producer({ defaultTransmission: Transmission.ASYNC })
const consumer = transport.consumer()

const main = async () => {
  consumer.subscribe(
    message => {
      console.log(message)
    },
    { channel: "orders" },
  )

  const result = await producer.send({
    body: "hello world!",
    headers: {
      channel: "orders",
    },
  })

  console.log(result)

  const message = await consumer.receive({ channel: "orders" })

  console.log(message)
}

main()

// const gateway = (config: any) => {}

// const x = gateway({
//   channels: {
//     orders: transport,
//     shipping: [producer, consumer],
//     "warehouse-request": [producer, consumer],
//     "warehouse-replay": [producer, consumer],
//   },
// })
