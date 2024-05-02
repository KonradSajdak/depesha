import { withMemoryTransport } from "../src/memory"
import { Transmission } from "../src/transport"
import { ChannelName, Gateway, createGateway } from "../src/gateway"

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

// const transport = withMemoryTransport()

// const producer = transport.producer({
//   defaultTransmission: Transmission.ASYNC,
//   bufferLimit: 10,
// })
// const consumer = transport.consumer()

interface EventPublisher<T> {
  publish: (event: T) => Promise<void>
}

interface EventListener {
  listen: () => Promise<void>
}

interface EventBus<T> extends EventPublisher<T>, EventListener {}

const createEventPublisher = <T>(
  channel: ChannelName,
  gateway: Gateway,
): EventPublisher<T> => {
  return {
    publish: async (event: T) => {
      await gateway.send({
        body: event,
        headers: { channel },
      })
    },
  }
}

const createEventListener = (
  channel: ChannelName,
  gateway: Gateway,
): EventListener => {
  return {
    listen: async () => {
      gateway.subscribe(
        message => {
          console.log(message)
        },
        { channel },
      )
    },
  }
}

const createEventBus = <T>(
  channel: ChannelName,
  gateway: Gateway,
): EventBus<T> => {
  const publisher = createEventPublisher(channel, gateway)
  const listener = createEventListener(channel, gateway)

  return {
    publish: publisher.publish,
    listen: listener.listen,
  }
}

// const createCommandBus = () => {}

// const gateway = createGateway({
//   transports: {
//     memory: withMemoryTransport(),
//   },
//   channels: {
//     orders: "memory",
//     invoices: "memory",
//     "warehouse-request": "memory",
//     "warehouse-replay": "memory",
//     events: "memory",
//   },
// })

const gateway = createGateway({
  channels: {
    events: withMemoryTransport({
      producer: { defaultTransmission: Transmission.SYNC },
    }),
  },
})

const events = createEventBus("events", gateway)

// const gateway = createGateway([producer, consumer])

const main = async () => {
  // await gateway.send({ body: "hello", headers: { channel: "orders" } })
  // await gateway.send({ body: "world", headers: { channel: "invoices" } })
  // await gateway.send({ body: "how", headers: { channel: "orders" } })
  // await gateway.send({ body: "are", headers: { channel: "invoices" } })
  // await gateway.send({ body: "you", headers: { channel: "orders" } })
  // await gateway.send({ body: "you", headers: { channel: "warehouse-request" } })

  // gateway.subscribe(
  //   message => {
  //     console.log(message)
  //   },
  //   { channel: "orders" },
  // )
  console.log("listing")
  events.listen()

  console.log("publishing")
  await events.publish({ type: "order-created", payload: { orderId: "123" } })
  console.log("published")

  // const message = await gateway.receive({ groupId: "A", channel: "orders" })

  // console.log(message.value)

  // await message.commit()

  // const message2 = await gateway.receive({
  //   groupId: "A+B",
  //   channel: "invoices",
  // })

  // console.log(message2)

  // const message3 = await gateway.receive({
  //   groupId: "A",
  //   channel: "warehouse-request",
  // })

  // console.log(message3)
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
