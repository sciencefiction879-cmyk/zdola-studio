const EventEmitter = require('events');
const { ThreadTask } = require('./dola-flow');

class BatchManager extends EventEmitter {
  constructor() {
    super();
    this.activeTasks = new Map();
    this.isRunning = false;
    this.totalAccounts = 0;
    this.completedAccounts = 0;
    this.failedAccounts = 0;
    this.currentAccountIndex = 0;
    this.threadCount = 4;
    this.config = {};
  }

  async start({ accountsCount = 8, threadCount = 4, config = {} }) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.totalAccounts = accountsCount;
    this.completedAccounts = 0;
    this.failedAccounts = 0;
    this.currentAccountIndex = 0;
    this.threadCount = Math.min(threadCount, accountsCount);
    this.config = config;

    this.emit('batch-start', {
      totalAccounts: this.totalAccounts,
      threadCount: this.threadCount
    });
    this.emit('log', `Starting batch: ${this.totalAccounts} accounts with ${this.threadCount} parallel threads.`);

    // Launch initial batch of threads
    const workers = [];
    for (let i = 0; i < this.threadCount; i++) {
      workers.push(this.runWorker(i));
    }

    await Promise.all(workers);
    this.isRunning = false;
    this.emit('batch-complete', {
      total: this.totalAccounts,
      completed: this.completedAccounts,
      failed: this.failedAccounts
    });
    this.emit('log', `Batch completed: ${this.completedAccounts} successful, ${this.failedAccounts} failed.`);
  }

  async runWorker(workerIndex) {
    while (this.isRunning && this.currentAccountIndex < this.totalAccounts) {
      const accountNum = ++this.currentAccountIndex;
      const threadId = String(workerIndex + 1).padStart(2, '0');
      
      const task = new ThreadTask(
        threadId,
        workerIndex,
        this.threadCount,
        this.config,
        this
      );

      this.activeTasks.set(threadId, task);

      try {
        await task.run();
        if (task.status.startsWith('SUCCESS')) {
          this.completedAccounts++;
        } else {
          this.failedAccounts++;
        }
      } catch (e) {
        this.failedAccounts++;
      } finally {
        this.emit('batch-progress', {
          completed: this.completedAccounts,
          failed: this.failedAccounts,
          total: this.totalAccounts
        });
      }
    }
  }

  proceedThread(threadId) {
    const task = this.activeTasks.get(threadId);
    if (task) task.proceed();
  }

  proceedAll() {
    for (const task of this.activeTasks.values()) {
      task.proceed();
    }
  }

  pauseThread(threadId) {
    const task = this.activeTasks.get(threadId);
    if (task) task.pause();
  }

  resumeThread(threadId) {
    const task = this.activeTasks.get(threadId);
    if (task) task.resume();
  }

  pauseAll() {
    for (const task of this.activeTasks.values()) {
      task.pause();
    }
  }

  resumeAll() {
    for (const task of this.activeTasks.values()) {
      task.resume();
    }
  }

  async refreshDola(threadId) {
    const task = this.activeTasks.get(threadId);
    if (task) await task.refreshDola();
  }

  async refreshAllDola() {
    for (const task of this.activeTasks.values()) {
      await task.refreshDola();
    }
  }

  async getCookies(threadId) {
    const task = this.activeTasks.get(threadId);
    if (task) {
      return await task.saveCookies();
    }
    return false;
  }

  async getAllCookies() {
    let saved = 0;
    for (const task of this.activeTasks.values()) {
      const res = await task.saveCookies();
      if (res) saved++;
    }
    this.emit('log', `Extracted cookies from ${saved} open browsers.`);
    return saved;
  }

  async closeAll() {
    this.emit('log', 'Closing all open Chrome browsers...');
    for (const task of this.activeTasks.values()) {
      await task.closeBrowser();
    }
    this.activeTasks.clear();
  }

  async stop() {
    this.isRunning = false;
    this.emit('log', 'Stopping batch creation...');
    for (const task of this.activeTasks.values()) {
      await task.stop();
    }
    this.activeTasks.clear();
  }
}

module.exports = {
  BatchManager: new BatchManager()
};
