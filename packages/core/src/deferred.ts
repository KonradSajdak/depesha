export class Deferred<T> {
  private readonly promiseInstance: Promise<T>
  private resolvePromise!: (value: T | PromiseLike<T>) => Promise<T>
  private rejectPromise!: (reason?: unknown) => void

  public constructor() {
    this.promiseInstance = new Promise<T>((resolve, reject) => {
      this.resolvePromise = (value: T | PromiseLike<T>) => {
        resolve(value)
        return this.promiseInstance
      }

      this.rejectPromise = (reason?: unknown) => reject(reason)
    })
  }

  public get promise() {
    return this.promiseInstance
  }

  public async resolve(value: T | PromiseLike<T>) {
    return this.resolvePromise(value)
  }

  public async reject(reason?: unknown) {
    return this.rejectPromise(reason)
  }
}
