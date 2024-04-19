import { withMemoryTransport } from "../src/memory"
import { MessageConstruction } from "../src/message"
import { Consumer, Producer, Transmission, Transport } from "../src/transport"

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
    }
  )

  await producer.send("hello")
  await producer.send("world")
  await producer.send("how")
  await producer.send("are")
  await producer.send("you")

  // const result = await Promise.all(messages.map(message => producer.send({ body: message, headers: { channel: "orders" } })))

  // console.log(result)

  const message = await consumer.receive({ groupId: "A" })

  console.log(message)

  // await message.commit()

  // const message2 = await consumer.receive({ groupId: "B" });

  // console.log(message2)
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
