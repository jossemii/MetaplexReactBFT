interface StackNode<T> {
  value: T | null;
  next: StackNode<T> | null;
}

class StackNode<T> implements StackNode<T> {
  constructor(val: T) {
    this.value = val;
    this.next = null;
  }
}

export interface Stack<T> {
  size: number;
  top: StackNode<T> | null;
  bottom: StackNode<T> | null;
  push(val: T): number;
  pop(): StackNode<T> | null;
}

export class Stack<T = string> implements Stack<T> {
  constructor() {
    this.size = 0;
    this.top = null;
    this.bottom = null;
  }
  size: number;
  top: StackNode<T> | null;
  bottom: StackNode<T> | null;

  extend(array: Array<T>) {
    for (let element of array) {
      this.push(element);
    }
  }

  push(val: T) {
    const node = new StackNode(val);
    if (this.size === 0) {
      this.top = node;
      this.bottom = node;
    } else {
      const currentTop = this.top;
      this.top = node;
      this.top.next = currentTop;
    }

    this.size += 1;
    return this.size;
  }

  pop(): StackNode<T> | null {
    if (this.size > 0) {
      const nodeToBeRemove = this.top as StackNode<T>;
      this.top = nodeToBeRemove.next;
      this.size -= 1;
      nodeToBeRemove.next = null;
      return nodeToBeRemove;
    }
    return null;
  }
}
