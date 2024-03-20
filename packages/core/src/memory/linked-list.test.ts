import { describe, expect, test } from "vitest"
import { LinkedList } from "./linked-list"

describe("LinkedList", () => {
  test("should append data", () => {
    // given
    const list = new LinkedList<number>()

    // when
    list.append(1)
    list.append(3)
    list.append(2)

    // then
    expect(list.toArray()).toEqual([1, 3, 2])
    expect(list.size()).toBe(3)
  })

  test("should prepend data", () => {
    // given
    const list = new LinkedList<number>()

    // when
    list.prepend(1)
    list.prepend(3)
    list.prepend(2)

    // then
    expect(list.toArray()).toEqual([2, 3, 1])
  })

  test("should delete node", () => {
    // given
    const list = new LinkedList<number>()

    // when
    list.append(1)
    const node2 = list.append(3)
    list.append(2)
    list.delete(node2)

    // then
    expect(list.toArray()).toEqual([1, 2])
  })

  test("should return empty array when list is empty", () => {
    // given
    const list = new LinkedList<number>()

    // when
    const array = list.toArray()

    // then
    expect(array).toEqual([])
  })

  test("should return size of list", () => {
    // given
    const list = new LinkedList<number>()

    // when
    list.append(1)
    list.append(3)
    list.append(2)

    // then
    expect(list.size()).toBe(3)
  })

  test("should return size of list when list is empty", () => {
    // given
    const list = new LinkedList<number>()

    // when
    const size = list.size()

    // then
    expect(size).toBe(0)
  })

  test("should find node by data", () => {
    // given
    const list = new LinkedList<number>()

    // when
    list.append(1)
    list.append(3)
    const node = list.append(2)

    // then
    expect(list.find(number => number === 2)).toBe(node)
  })

  test("should create linked list from array", () => {
    // given
    const array = [1, 3, 2]

    // when
    const list = LinkedList.fromArray(array)

    // then
    expect(list.toArray()).toEqual(array)
  })

  test("should return first node", () => {
    // given
    const list = new LinkedList<number>()

    // when
    const node = list.append(1)
    list.append(3)
    list.append(2)

    // then
    expect(list.first()).toBe(node)
  })
})
