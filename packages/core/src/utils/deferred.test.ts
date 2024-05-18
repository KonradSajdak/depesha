import { test, describe, expect } from "vitest"
import { Deferred } from "./deferred"

describe("Deferred", () => {
  test("should resolve a Promise", async () => {
    // given
    const deferred = new Deferred()

    // when
    const result = await deferred.resolve("test")

    // then
    expect(result).toBe("test")
  })

  test("should resolve a shared Promise instance", async () => {
    // given
    const deferred = new Deferred()
    const promise = deferred.promise

    // when
    deferred.resolve("test")

    // then
    await expect(promise).resolves.toBe("test")
  })

  test("should reject a shared Promise instance", async () => {
    // given
    const deferred = new Deferred()
    const promise = deferred.promise

    // when
    await deferred.reject(new Error())

    // then
    await expect(promise).rejects.toThrowError()
  })
})
