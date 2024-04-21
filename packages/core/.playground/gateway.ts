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

const gateway = createGateway([producer, consumer])

const main = async () => {
  // consumer.subscribe(
  //   message => {
  //     console.log(message)
  //   }
  // )

  await gateway.send("hello")
  await gateway.send("world")
  await gateway.send("how")
  await gateway.send("are")
  await gateway.send("you")

  // const result = await Promise.all(messages.map(message => producer.send({ body: message, headers: { channel: "orders" } })))

  // console.log(result)

  const message = await gateway.receive({ groupId: "A" })

  console.log(message)

  await message.commit()

  const message2 = await gateway.receive({ groupId: "B" })

  console.log(message2)
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
