export class Node<T> {
  public next: Node<T> | null = null
  public prev: Node<T> | null = null
  constructor(public data: T) {}
}

export class LinkedList<T> {
  private head: Node<T> | null = null

  public prepend(data: T): Node<T> {
    const node = new Node(data)
    if (!this.head) {
      this.head = node
      return node
    }

    this.head.prev = node
    node.next = this.head
    this.head = node

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
    node.prev = lastNode
    lastNode.next = node

    return node
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
    previousNode.next = node.next
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

  public static fromArray<T>(array: T[]) {
    const linkedList = new LinkedList<T>()
    array.forEach(value => linkedList.append(value))
    return linkedList
  }
}
