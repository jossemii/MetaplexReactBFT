export class Queue<T> {
  _store: T[] = [];

  extend(array: Array<T>) {
    for (let element of array) {
      this.push(element);
    }
  }

  push(val: T) {
    this._store.push(val);
  }

  pop(): T {
    let e = this._store.shift();
    if (e == undefined) {
      throw new Error('Queue empty.');
    } else {
      return e;
    }
  }
}
