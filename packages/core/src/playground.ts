import { depesha, publishSubscribe } from "./index"

const ENV = {}

const fromEnv = (env: Record<string, string>) => {
  return {
    adapter: publishSubscribe(),
    handleMessage: async (message: Record<string, unknown>) => {},
  }
}

const { adapter, handleMessage } = fromEnv(ENV)
const gateway = depesha({
  channels: {
    orders: adapter,
  },
})

handleMessage({})
