import * as chalk from 'chalk';
import * as inquirerType from 'inquirer';
import ui = inquirerType.ui;

import { ILogger, ITask, ITaskChain } from '../../definitions';

import { ICON_FAILURE, ICON_SUCCESS, SPINNER_FRAMES } from './format';

class Spinner {
  public i: number = 0;

  constructor(public frames: string[] = SPINNER_FRAMES) {}

  frame(): string {
    return this.frames[this.i = ++this.i % this.frames.length];
  }
}

class Task implements ITask {
  public msg: string;
  public log: ILogger;
  public running = false;
  public progressRatio = -1;

  constructor({ msg, log }: { msg: string, log: ILogger }) {
    this.msg = msg;
    this.log = log;
  }

  start(): this {
    this.running = true;

    return this;
  }

  progress(prog: number, total: number): this {
    this.progressRatio = prog / total;
    return this;
  }

  clear(): this {
    return this;
  }

  end(): this {
    this.running = false;
    this.clear();

    return this;
  }

  succeed(): this {
    if (this.running) {
      this.end();

      if (this.log.shouldLog('info')) {
        this.log.msg(`${chalk.green(ICON_SUCCESS)} ${this.msg} - done!`);
      }
    }

    return this;
  }

  fail(): this {
    if (this.running) {
      this.end();

      if (this.log.shouldLog('info')) {
        this.log.msg(`${chalk.red(ICON_FAILURE)} ${this.msg} - failed!`);
      }
    }

    return this;
  }
}

export class TaskChain implements ITaskChain {
  public log: ILogger;

  protected currentTask?: ITask;
  protected tasks: ITask[];

  constructor({ log }: { log: ILogger }) {
    this.log = log;
    this.tasks = [];
  }

  next(msg: string): ITask {
    return this._next(new Task({ msg, log: this.log }));
  }

  protected _next(task: ITask): ITask {
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
    for (let task of this.tasks) {
      if (task.running) {
        task.fail();
      }

      task.clear();
    }

    return this;
  }
}

class InteractiveTask extends Task {
  public bottomBar: ui.BottomBar;

  public intervalId?: any;
  private spinner: Spinner;

  constructor({ msg, log, bottomBar }: { msg: string, log: ILogger, bottomBar: ui.BottomBar }) {
    super({ msg, log });
    this.bottomBar = bottomBar;
    this.spinner = new Spinner();
  }

  start(): this {
    if (!this.running) {
      this.intervalId = setInterval(() => { this.tick(); }, 50);
    }

    super.start();

    return this;
  }

  tick(): this {
    if (this.log.shouldLog('info')) {
      this.bottomBar.updateBottomBar(this.format());
    }

    return this;
  }

  progress(prog: number, total: number): this {
    super.progress(prog, total);
    this.tick();

    return this;
  }

  format(): string {
    const progress = this.progressRatio >= 0 ? (this.progressRatio * 100).toFixed(2) : '';
    const frame = this.spinner.frame();
    return `${chalk.bold(frame)} ${this.msg}${progress ? ' (' + chalk.bold(String(progress) + '%') + ')' : ''} `;
  }

  clear(): this {
    clearInterval(this.intervalId);

    if (this.log.shouldLog('info')) {
      this.bottomBar.updateBottomBar('');
    }

    return this;
  }

  end(): this {
    this.tick();
    super.end();

    return this;
  }

}

export class InteractiveTaskChain extends TaskChain {
  public bottomBar: ui.BottomBar;

  constructor({ log, bottomBar }: { log: ILogger, bottomBar: ui.BottomBar }) {
    super({ log });
    this.bottomBar = bottomBar;
  }

  next(msg: string): ITask {
    return this._next(new InteractiveTask({ msg, log: this.log, bottomBar: this.bottomBar }));
  }

}
