export class Node<T> {
  private _next: Node<T> | null = null
  private _prev: Node<T> | null = null

  private seq: number = 0
  private locked: boolean = false

  public constructor(public data: T) {}

  public isEarlierThan(node: Node<T> | null) {
    return !node || this.seq < node.seq
  }

  public attachNext(node: Node<T> | null) {
    this._next = node
    if (!node) return

    node._prev = this
    node.seq = this.seq + 1
  }

  public attachPrev(node: Node<T> | null) {
    this._prev = node
    if (!node) return

    node._next = this
    this.seq = node.seq + 1
  }

  public get next() {
    return this._next
  }

  public get prev() {
    return this._prev
  }

  public isLocked() {
    return this.locked
  }

  public lock() {
    this.locked = true
  }

  public unlock() {
    this.locked = false
  }
}

export interface Locked<T> {
  value: T
  commit: () => void
  rollback: () => void
}

export class Pointer<T> {
  private constructor(private pointer: Node<T> | null = null) {}

  public forceToEarliest(node: Node<T> | null) {
    if (!this.pointer || !node) {
      return new Pointer<T>(null)
    }

    if (node.isEarlierThan(this.pointer)) {
      return new Pointer<T>(node)
    }

    return new Pointer<T>(this.pointer)
  }

  public forceTo(node: Node<T> | null) {
    return new Pointer<T>(node)
  }

  public current() {
    return this.pointer
  }

  public static createNew<T>() {
    return new Pointer<T>()
  }
}

export class LinkedList<T> {
  private pointer: Pointer<T> = Pointer.createNew<T>()
  private head: Node<T> | null = null

  public prepend(data: T): Node<T> {
    const node = new Node(data)
    if (!this.head) {
      this.head = node
      return node
    }

    this.head.attachPrev(node)
    this.head = node

    this.pointer = this.pointer.forceTo(node.prev)

    return node
  }

  public append(data: T): Node<T> {
    const node = new Node(data)
    if (!this.head) {
      this.head = node
      return node
    }

    const getLast = (node: Node<T>): Node<T> => {
      return node.next ? getLast(node.next) : node
    }

    const lastNode = getLast(this.head)
    lastNode.attachNext(node)

    return node
  }

  public appendWithLock(data: T): Locked<T> {
    const node = this.append(data)
    return this.withLock(node)
  }

  public shiftWithLock(): Locked<T> | null {
    const node = this.pointer.current() ?? this.head

    const getFirstAvailable = (node: Node<T> | null): Node<T> | null => {
      if (!node) return null
      return node.isLocked() ? getFirstAvailable(node.next) : node
    }

    const next = getFirstAvailable(node)
    if (!next) return null

    return this.withLock(next)
  }

  private withLock(node: Node<T>): Locked<T> {
    this.pointer = this.pointer.forceToEarliest(node)
    node.lock()

    let commitAlready = false
    const commit = (node: Node<T>) => {
      if (commitAlready) throw new Error("Committed already.")
      if (rollbackAlready) throw new Error("Rollback already.")

      this.pointer = this.pointer.forceToEarliest(node.prev)
      this.delete(node)
      commitAlready = true
    }

    let rollbackAlready = false
    const rollback = (node: Node<T>) => {
      if (rollbackAlready) throw new Error("Rollback already.")
      if (commitAlready) throw new Error("Committed already.")

      this.pointer = this.pointer.forceToEarliest(node.prev)
      node.unlock()
      rollbackAlready = true
    }

    return {
      value: node.data,
      commit: () => commit(node),
      rollback: () => rollback(node),
    }
  }

  public first(): Node<T> | null {
    return this.head
  }

  public delete(node: Node<T>): void {
    if (!node.prev) {
      this.head = node.next
      return
    }

    const previousNode = node.prev
    previousNode.attachNext(node.next)
  }

  public erase(): void {
    this.head = null
  }

  public toArray(): T[] {
    const array: T[] = []
    if (!this.head) {
      return array
    }

    const addToArray = (node: Node<T>): T[] => {
      array.push(node.data)
      return node.next ? addToArray(node.next) : array
    }

    return addToArray(this.head)
  }

  public size(): number {
    return this.toArray().length
  }

  public find(comparator: (data: T) => boolean): Node<T> | null {
    const checkNext = (node: Node<T>): Node<T> | null => {
      if (comparator(node.data)) {
        return node
      }

      return node.next ? checkNext(node.next) : null
    }

    return this.head ? checkNext(this.head) : null
  }

  public map<R>(mapper: (data: T) => R): LinkedList<R> {
    const linkedList = new LinkedList<R>()
    if (!this.head) {
      return linkedList
    }

    const mapNext = (node: Node<T>): void => {
      linkedList.append(mapper(node.data))
      if (node.next) {
        mapNext(node.next)
      }
    }

    mapNext(this.head)

    return linkedList
  }

  public static fromArray<T>(array: T[]) {
    const linkedList = new LinkedList<T>()
    array.forEach(value => linkedList.append(value))
    return linkedList
  }
}
