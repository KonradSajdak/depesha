export class Deferred<T> {
  private readonly promiseInstance: Promise<T>
  private resolvePromise!: (value: T | PromiseLike<T>) => Promise<T>
  private rejectPromise!: (reason?: any) => Promise<T>

  public constructor() {
    this.promiseInstance = new Promise<T>((resolve, reject) => {
      this.resolvePromise = (value: T | PromiseLike<T>) => {
        resolve(value)
        return this.promiseInstance
      }

      this.rejectPromise = (reason?: any) => {
        reject(reason)
        return this.promiseInstance
      }
    })
  }

  public get promise() {
    return this.promiseInstance
  }

  public async resolve(value: T | PromiseLike<T>) {
    return this.resolvePromise(value)
  }

  public async reject(reason?: any) {
    return this.rejectPromise(reason)
  }
}
