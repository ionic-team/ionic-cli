import * as tty from 'tty';

import * as chalk from 'chalk';
import * as inquirerType from 'inquirer';
import ui = inquirerType.ui;
import * as ProgressBarType from 'progress';

import { ITask, ITaskChain } from '../../definitions';

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
  public intervalId?: any;
  public running: boolean = false;
  private spinner: Spinner;
  private progressBar?: ProgressBarType;

  constructor(public msg: string, public bottomBar: ui.BottomBar) {
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
    this.bottomBar.updateBottomBar(this.format());
    return this;
  }

  progress(prog: number, total: number): this {
    if (this.running) {
      if (!this.progressBar) {
        const term = <any>tty; // TODO: type def issue
        const ProgressBar = load('progress');
        const s = new term.WriteStream();
        s.columns = s.columns || 80;
        this.progressBar = new ProgressBar('[:bar] :percent', {
          total: total,
          width: 30,
          stream: s,
        });
      }

      const progbar = <any>this.progressBar; // TODO: type def issue
      progbar.curr = prog;

      if (prog < total) {
        this.progressBar.tick(0);
      }

      this.tick();
    }

    return this;
  }

  format(): string {
    const progbar = <any>this.progressBar; // TODO: type def issue
    const progress = progbar ? progbar.lastDraw.trim() : '';
    return `${chalk.bold(this.spinner.frame())} ${this.msg} ${progress}`;
  }

  clear(): this {
    clearInterval(this.intervalId);

    this.bottomBar.updateBottomBar('');

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
      this.bottomBar.log.write(`${chalk.green(ICON_SUCCESS_GREEN)} ${this.msg} - done!`);
    }

    return this;
  }

  fail(): this {
    if (this.running) {
      this.end();
      this.bottomBar.log.write(`${chalk.red(ICON_FAILURE_RED)} ${this.msg} - failed!`);
    }

    return this;
  }
}

export class TaskChain implements ITaskChain {
  protected currentTask?: Task;
  public tasks: ITask[];

  constructor(public bottomBar: ui.BottomBar) {
    this.tasks = [];
  }

  next(msg: string): Task {
    if (this.currentTask) {
      this.currentTask.succeed();
    }

    const task = new Task(msg, this.bottomBar);
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
