


class Semaphore {
  constructor(maxConcurrent) {
    this.maxConcurrent = maxConcurrent;
    this.running = 0;
    this.queue = [];
    this._delaysData = [];
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

  getPerformanceMetric(metricName) {
    const getRecentTasksMinDelay = () => {
      if(this.running===0) return 0; // true
      const maxConcurrent = this.maxConcurrent>1 ? this.maxConcurrent : 1;
      const recentDelays = this._delaysData.slice(Math.max(this._delaysData.length - maxConcurrent, 0));
      const minDelay = Math.min(...recentDelays.map(a=>a.duration));
      return minDelay;
    }
    const metrics = {
      'recent-tasks-min-delay': getRecentTasksMinDelay,
    };
    return metrics[metricName];
  }

  async run(fn) {
    const timeStarted = new Date();
    const delayData = {timeStarted,duration:0};
    this._delaysData.push(delayData);
    const intId = setInterval(()=>{
      const timeNow = new Date();
      const duration = new Date((+timeNow) - (+timeStarted));
      delayData.duration = duration;
    },309);
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
      clearInterval(intId);
      const timeFinished = new Date();
      const duration = new Date((+timeFinished) - (+timeStarted));
      delayData.duration = duration;
    }
  }
}

export default Semaphore;
