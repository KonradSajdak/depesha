import { afterEach, beforeEach } from "vitest"

export const useFakeAbortSignalTimeout = () => {
  // eslint-disable-next-line
  const original = AbortSignal.timeout

  beforeEach(() => {
    AbortSignal.timeout = (ms: number) => {
      const controller = new AbortController()
      setTimeout(() => controller.abort(new DOMException("TimeoutError")), ms)
      return controller.signal
    }
  })

  afterEach(() => {
    AbortSignal.timeout = original
  })
}
