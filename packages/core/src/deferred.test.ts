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

  test("should rejects a Promise", async () => {
    // given
    const deferred = new Deferred()

    // then
    await expect(deferred.reject(new Error())).rejects.toThrowError()
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
    await expect(deferred.reject(new Error())).rejects.toThrowError()

    // then
    await expect(promise).rejects.toThrowError()
  })
})
