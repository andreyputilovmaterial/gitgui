


class Lock {
  constructor() {
    this.queue = [];
    this.locked = false;
  }

  acquire() {
    return new Promise(resolve => {
      if (!this.locked) {
        this.locked = true;
        resolve(() => this.release());
      } else {
        this.queue.push(resolve);
      }
    });
  }

  release() {
    const next = this.queue.shift();

    if (next) {
      next(() => this.release());
    } else {
      this.locked = false;
    }
  }
}

export default Lock;
