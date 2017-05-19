import * as tty from 'tty';

import * as chalk from 'chalk';
import * as inquirerType from 'inquirer';
import ui = inquirerType.ui;

import { ILogger, ITask, ITaskChain } from '../../definitions';

import { ICON_SUCCESS_GREEN, ICON_FAILURE_RED } from './format';
import { load } from '../modules';

const FRAMES = process.platform === 'win32' ?
  ['-', '\\', '|', '/'] :
  ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

class Spinner {
  public i: number = 0;

  constructor(public frames: string[] = FRAMES) {}

  frame(): string {
    return this.frames[this.i = ++this.i % this.frames.length];
  }
}

export class Task implements ITask {
  public msg: string;
  public log: ILogger;
  public bottomBar: ui.BottomBar;

  public intervalId?: any;
  public running: boolean = false;
  private spinner: Spinner;
  public progressRatio = -1;

  constructor({ msg, log, bottomBar }: { msg: string, log: ILogger, bottomBar: ui.BottomBar }) {
    this.msg = msg;
    this.log = log;
    this.bottomBar = bottomBar;
    this.spinner = new Spinner();
  }

  start(): this {
    if (!this.running) {
      this.intervalId = setInterval(() => { this.tick(); }, 50);
    }

    this.running = true;

    return this;
  }

  tick(): this {
    if (this.log.shouldLog('info')) {
      this.bottomBar.updateBottomBar(this.format());
    }

    return this;
  }

  progress(prog: number, total: number): this {
    this.progressRatio = prog / total;
    this.tick();

    return this;
  }

  format(): string {
    const progress = this.progressRatio >= 0 ? (this.progressRatio * 100).toFixed(2) : '';
    return `${chalk.bold(this.spinner.frame())} ${this.msg}${progress ? ' (' + chalk.bold(String(progress) + '%') + ')' : ''} `;
  }

  clear(): this {
    clearInterval(this.intervalId);

    if (this.log.shouldLog('info')) {
      this.bottomBar.updateBottomBar('');
    }

    return this;
  }

  end(): this {
    this.running = false;
    this.tick();
    this.clear();

    return this;
  }

  succeed(): this {
    if (this.running) {
      this.end();

      if (this.log.shouldLog('info')) {
        this.bottomBar.log.write(`${chalk.green(ICON_SUCCESS_GREEN)} ${this.msg} - done!`);
      }
    }

    return this;
  }

  fail(): this {
    if (this.running) {
      this.end();

      if (this.log.shouldLog('info')) {
        this.bottomBar.log.write(`${chalk.red(ICON_FAILURE_RED)} ${this.msg} - failed!`);
      }
    }

    return this;
  }
}

export class TaskChain implements ITaskChain {
  public log: ILogger;
  public bottomBar: ui.BottomBar;

  protected currentTask?: Task;
  public tasks: ITask[];

  constructor({ log, bottomBar }: { log: ILogger, bottomBar: ui.BottomBar }) {
    this.log = log;
    this.bottomBar = bottomBar;
    this.tasks = [];
  }

  next(msg: string): Task {
    if (this.currentTask) {
      this.currentTask.succeed();
    }

    const task = new Task({ msg, log: this.log, bottomBar: this.bottomBar });
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
