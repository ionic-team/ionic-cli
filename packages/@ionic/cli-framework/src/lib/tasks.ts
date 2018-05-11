import { EventEmitter } from 'events';

export interface TaskOptions {
  msg?: string;
  tickInterval?: number;
}

export interface Task extends EventEmitter {
  on(name: 'success', handler: () => void): this;
  on(name: 'failure', handler: () => void): this;
  on(name: 'clear', handler: () => void): this;
  on(name: 'tick', handler: () => void): this;
  on(name: 'end', handler: () => void): this;
  emit(name: 'success'): boolean;
  emit(name: 'failure'): boolean;
  emit(name: 'clear'): boolean;
  emit(name: 'tick'): boolean;
  emit(name: 'end'): boolean;
}

export class Task extends EventEmitter {
  tickInterval?: number;

  intervalId?: NodeJS.Timer;
  running = false;
  progressRatio?: number;

  protected _msg = '';

  constructor({ msg = '', tickInterval }: TaskOptions = {}) {
    super();
    this.msg = msg;
    this.tickInterval = tickInterval;
  }

  get msg(): string {
    return this._msg;
  }

  set msg(msg: string) {
    this._msg = msg;
    this.tick();
  }

  start(): this {
    if (!this.running && this.tickInterval) {
      this.intervalId = setInterval(() => { this.tick(); }, this.tickInterval);
    }

    this.running = true;

    return this;
  }

  tick(): this {
    this.emit('tick');
    return this;
  }

  progress(prog: number, total: number): this {
    this.progressRatio = prog / total;
    this.tick();

    return this;
  }

  clear(): this {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.emit('clear');

    return this;
  }

  end(): this {
    this.running = false;
    this.tick();
    this.clear();
    this.emit('end');

    return this;
  }

  succeed(): this {
    if (this.running) {
      this.end();
      this.emit('success');
    }

    return this;
  }

  fail(): this {
    if (this.running) {
      this.end();
      this.emit('failure');
    }

    return this;
  }
}

export interface TaskChainOptions {
  taskOptions?: Partial<TaskOptions>;
}

export class TaskChain {
  protected currentTask?: Task;
  protected tasks: Task[];
  protected taskOptions: Partial<TaskOptions>;

  constructor({ taskOptions = {} }: TaskChainOptions = {}) {
    this.tasks = [];
    this.taskOptions = taskOptions;
  }

  next(msg: string): Task {
    return this.nextTask(this.createTask({ msg, ...this.taskOptions }));
  }

  createTask(options: TaskOptions): Task {
    return new Task(options);
  }

  nextTask(task: Task): Task {
    if (this.currentTask) {
      this.currentTask.succeed();
    }

    this.tasks.push(task);
    this.currentTask = task;

    task.start();

    return task;
  }

  updateMsg(msg: string): this {
    if (this.currentTask) {
      this.currentTask.msg = msg;
    }

    return this;
  }

  end(): this {
    if (this.currentTask) {
      this.currentTask.succeed();
      this.currentTask = undefined;
    }

    return this;
  }

  fail(): this {
    if (this.currentTask) {
      this.currentTask.fail();
    }

    return this;
  }

  cleanup(): this {
    for (const task of this.tasks) {
      if (task.running) {
        task.fail();
      } else {
        task.clear();
      }
    }

    return this;
  }
}
