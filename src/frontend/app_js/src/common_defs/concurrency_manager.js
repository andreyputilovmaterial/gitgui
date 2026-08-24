class Semaphore {
  constructor(maxConcurrent) {
    this.maxConcurrent = maxConcurrent;
    this.running = 0;
    this.queue = [];
  }

  acquire() {
    return new Promise(resolve => {
      this.queue.push(resolve);
      this._next();
    });
  }

  release() {
    this.running--;
    this._next();
  }

  _next() {
    if (this.running >= this.maxConcurrent) return;

    const resolve = this.queue.shift();
    if (!resolve) return;

    this.running++;
    resolve(() => this.release());
  }

  async run(fn) {
    const release = await this.acquire();

    try {
      return await fn();
    } finally {
      release();
    }
  }
}

export default Semaphore;
