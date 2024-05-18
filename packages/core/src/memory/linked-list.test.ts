import { describe, expect, test } from "vitest"
import { LinkedList, Node, Pointer } from "./linked-list"

describe("LinkedList (controlled)", () => {
  describe("Node", () => {
    test("should keep sequence number", () => {
      // given
      const nodeA = new Node("A")
      const nodeB = new Node("B")
      const nodeC = new Node("C")

      // when
      nodeA.attachNext(nodeB)
      nodeC.attachPrev(nodeB)

      // then
      expect(nodeA.isEarlierThan(nodeB)).toBe(true)
      expect(nodeB.isEarlierThan(nodeC)).toBe(true)
      expect(nodeB.isEarlierThan(nodeA)).toBe(false)
      expect(nodeC.isEarlierThan(nodeB)).toBe(false)
    })
  })

  describe("Pointer", () => {
    test("should create pointer from earliest node", () => {
      // given
      const nodeA = new Node("A")
      const nodeB = new Node("B")

      nodeA.attachNext(nodeB)

      const pointer = Pointer.createNew<string>()

      // when
      const pointerA = pointer.forceTo(nodeB).forceToEarliest(nodeA)
      const pointerB = pointer.forceTo(nodeA).forceToEarliest(nodeB)
      const pointerC = pointer.forceTo(nodeB).forceToEarliest(null)
      const pointerD = pointer.forceTo(null).forceToEarliest(nodeA)

      // then
      expect(pointerA.current()).toBe(nodeA)
      expect(pointerB.current()).toBe(nodeA)
      expect(pointerC.current()).toBe(null)
      expect(pointerD.current()).toBe(null)
    })
  })

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

  test("should map list", () => {
    // given
    const list = new LinkedList<number>()

    // when
    list.append(1)
    list.append(3)
    list.append(2)
    const mapped = list.map(number => number * 2)

    // then
    expect(mapped.toArray()).toEqual([2, 6, 4])
  })

  test("should shift and commit first node with lock", () => {
    // given
    const list = LinkedList.fromArray([1, 3, 2])

    // then
    expect(list.size()).toBe(3)

    // when
    const node = list.shiftWithLock()!

    // then
    expect(node.value).toBe(1)
    expect(list.size()).toBe(3)

    // when
    node.commit()
    const nextNode = list.shiftWithLock()!

    // then
    expect(list.size()).toBe(2)
    expect(nextNode.value).toBe(3)
  })

  test("should shift and rollback first node with lock", () => {
    // given
    const list = LinkedList.fromArray([1, 3, 2])

    // then
    expect(list.size()).toBe(3)

    // when
    const node = list.shiftWithLock()!

    // then
    expect(node.value).toBe(1)

    // when
    node.rollback()
    const nextNode = list.shiftWithLock()!

    // then
    expect(list.size()).toBe(3)
    expect(nextNode.value).toBe(1)
  })

  test("should shift rollbacked node with lock", () => {
    // given
    const list = LinkedList.fromArray([1, 2, 3])

    // when
    const nodeA = list.shiftWithLock()!
    const nodeB = list.shiftWithLock()!
    const nodeC = list.shiftWithLock()!

    // then
    expect(nodeA.value).toBe(1)
    expect(nodeB.value).toBe(2)
    expect(nodeC.value).toBe(3)

    // when
    nodeB.rollback()

    // then
    const nodeB2 = list.shiftWithLock()!
    expect(nodeB2.value).toBe(2)

    // when
    nodeA.rollback()
    nodeC.rollback()

    // then
    const nodeA2 = list.shiftWithLock()!
    const nodeC2 = list.shiftWithLock()!

    expect(nodeA2.value).toBe(1)
    expect(nodeC2.value).toBe(3)
  })

  test("should commit and rollback only once", () => {
    // given
    const list = LinkedList.fromArray([1, 2])

    // when
    const nodeA = list.shiftWithLock()!
    nodeA.commit()

    // then
    expect(() => nodeA.commit()).toThrow("Committed already.")
    expect(() => nodeA.rollback()).toThrow("Committed already.")

    // when
    const nodeB = list.shiftWithLock()!
    nodeB.rollback()

    // then
    expect(() => nodeB.commit()).toThrow("Rollback already.")
    expect(() => nodeB.rollback()).toThrow("Rollback already.")
  })

  test("should not shift when doesn't have available nodes", () => {
    // given
    const list = LinkedList.fromArray([1])

    // when
    const nodeA = list.shiftWithLock()
    const nodeB = list.shiftWithLock()

    // then
    expect(() => nodeA).not.toBeNull()
    expect(nodeB).toBeNull()
  })
})
