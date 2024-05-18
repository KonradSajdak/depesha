export class Deferred<T> {
  private readonly promiseInstance: Promise<T>
  private resolvePromise!: (value: T | PromiseLike<T>) => Promise<T>
  private rejectPromise!: (reason?: unknown) => void

  public constructor(options?: { signal?: AbortSignal }) {
    this.promiseInstance = new Promise<T>((resolve, reject) => {
      if (options?.signal?.aborted) {
        reject(options.signal.reason)
      }

      this.resolvePromise = (value: T | PromiseLike<T>) => {
        resolve(value)
        return this.promiseInstance
      }

      this.rejectPromise = (reason?: unknown) => reject(reason)

      options?.signal?.addEventListener("abort", () => {
        reject(options.signal?.reason)
      })
    })
  }

  public get promise() {
    return this.promiseInstance
  }

  public async resolve(value: T | PromiseLike<T>) {
    return this.resolvePromise(value)
  }

  public reject(reason?: unknown) {
    return this.rejectPromise(reason)
  }
}
