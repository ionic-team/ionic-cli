import { EventEmitter } from 'events';

import { OutputStrategy } from '../definitions';
import { isRedrawLine } from '../guards';
import { Colors, DEFAULT_COLORS } from './colors';

const isWindows = process.platform === 'win32';

export const ICON_SUCCESS = isWindows ? '√' : '✔';
export const ICON_FAILURE = isWindows ? '×' : '✖';

const SPINNER_FRAMES = isWindows ?
  ['-', '\\', '|', '/'] :
  ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export class Spinner {
  i = 0;

  constructor(public frames: string[] = SPINNER_FRAMES) {}

  frame(): string {
    return this.frames[this.i = ++this.i % this.frames.length];
  }
}

export interface TaskOptions {
  readonly msg?: string;
  readonly tickInterval?: number;
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

export interface TaskChain extends EventEmitter {
  on(name: 'end', handler: (lastTask?: Task) => void): this;
  on(name: 'failure', handler: (failedTask?: Task) => void): this;
  on(name: 'next', handler: (task: Task) => void): this;
  emit(name: 'end', lastTask?: Task): boolean;
  emit(name: 'failure', failedTask?: Task): boolean;
  emit(name: 'next', task: Task): boolean;
}

export interface TaskChainOptions {
  readonly taskOptions?: Partial<TaskOptions>;
}

export class TaskChain extends EventEmitter {
  protected current?: Task;
  protected readonly tasks: Task[];
  protected readonly taskOptions: Partial<TaskOptions>;

  constructor({ taskOptions = {} }: TaskChainOptions = {}) {
    super();
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
    if (this.current) {
      this.current.succeed();
    }

    this.tasks.push(task);
    this.current = task;

    task.start();

    this.emit('next', task);

    return task;
  }

  end(): this {
    const task = this.current;

    if (task) {
      task.succeed();
    }

    this.current = undefined;
    this.emit('end', task);

    return this;
  }

  fail(): this {
    const task = this.current;

    if (task) {
      task.fail();
    }

    this.emit('failure', task);

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

export interface CreateTaskChainOptions {
  readonly output: OutputStrategy;
  readonly colors?: Colors;
}

export function createTaskChainWithOutput({ output, colors = DEFAULT_COLORS }: CreateTaskChainOptions): TaskChain {
  const { failure, strong, success } = colors;
  const chain = new TaskChain({ taskOptions: { tickInterval: 50 } });

  chain.on('next', task => {
    task.on('success', () => {
      output.stream.write(`${success(ICON_SUCCESS)} ${task.msg} - done!`);
    });

    task.on('failure', () => {
      output.stream.write(`${failure(ICON_FAILURE)} ${task.msg} - failed!`);
    });

    if (isRedrawLine(output)) {
      const spinner = new Spinner();

      task.on('tick', () => {
        const progress = task.progressRatio ? (task.progressRatio * 100).toFixed(2) : '';
        const frame = spinner.frame();

        output.redrawLine(`${strong(frame)} ${task.msg}${progress ? ' (' + strong(String(progress) + '%') + ')' : ''} `);
      });

      task.on('clear', () => {
        output.redrawLine('');
      });
    }
  });

  return chain;
}
