import { withMemoryTransport } from "../src/memory"
import { MessageConstruction } from "../src/message"
import { Consumer, Producer, Transmission, Transport } from "../src/transport"
import { createGateway } from "../src/gateway"

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

const producer = transport.producer({
  defaultTransmission: Transmission.ASYNC,
  bufferLimit: 10,
})
const consumer = transport.consumer()

const gateway = createGateway({
  transports: {
    memory: withMemoryTransport(),
  },
  channels: {
    orders: [producer, consumer],
    invoices: "memory",
    "warehouse-request": "memory",
    "warehouse-replay": "memory",
  },
})
// const gateway = createGateway([producer, consumer])

const main = async () => {
  await gateway.send({ body: "hello", headers: { channel: "orders" } })
  await gateway.send({ body: "world", headers: { channel: "invoices" } })
  await gateway.send({ body: "how", headers: { channel: "orders" } })
  await gateway.send({ body: "are", headers: { channel: "invoices" } })
  await gateway.send({ body: "you", headers: { channel: "orders" } })
  await gateway.send({ body: "you", headers: { channel: "warehouse-request" } })

  const message = await gateway.receive({ groupId: "A", channel: "orders" })

  console.log(message)

  await message.commit()

  const message2 = await gateway.receive({
    groupId: "A+B",
    channel: "invoices",
  })

  console.log(message2)

  const message3 = await gateway.receive({
    groupId: "A",
    channel: "warehouse-request",
  })

  console.log(message3)
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
