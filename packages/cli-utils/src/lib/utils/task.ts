import * as tty from 'tty';

import * as chalk from 'chalk';
import * as inquirerType from 'inquirer';
import ui = inquirerType.ui;
import * as ProgressBarType from 'progress';

import { ICON_SUCCESS_GREEN, ICON_FAILURE_RED } from './format';
import { load } from '../modules';

const FRAMES = process.platform === 'win32' ?
  ['-', '\\', '|', '/'] :
  ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export const TASKS: Task[] = [];

class Spinner {
  public i: number = 0;

  constructor(public frames: string[] = FRAMES) {}

  frame(): string {
    return this.frames[this.i = ++this.i % this.frames.length];
  }
}

export class Task {
  public intervalId?: any;
  public running: boolean = false;
  protected bottomBar: ui.BottomBar;
  private spinner: Spinner;
  private progressBar?: ProgressBarType;

  constructor(public msg: string) {
    this.spinner = new Spinner();
    const inquirer = load('inquirer');
    this.bottomBar = new inquirer.ui.BottomBar();
    TASKS.push(this);
  }

  start(): void {
    if (!this.running) {
      this.intervalId = setInterval(() => { this.tick(); }, 50);
    }

    this.running = true;
  }

  tick(): void {
    this.bottomBar.updateBottomBar(this.format());
  }

  progress(prog: number, total: number) {
    if (this.running) {
      if (!this.progressBar) {
        const term = <any>tty; // TODO: type def issue
        const ProgressBar = load('progress');
        this.progressBar = new ProgressBar('[:bar] :percent', {
          total: total,
          width: 30,
          stream: new term.WriteStream(),
        });
      }

      const progbar = <any>this.progressBar; // TODO: type def issue
      progbar.curr = prog;

      if (prog < total) {
        this.progressBar.tick(0);
      }

      this.tick();
    }
  }

  format(): string {
    const progbar = <any>this.progressBar; // TODO: type def issue
    const progress = progbar ? progbar.lastDraw.trim() : '';
    return `${chalk.bold(this.spinner.frame())} ${this.msg} ${progress}`;
  }

  clear(): void {
    clearInterval(this.intervalId);

    this.bottomBar.updateBottomBar('');
    this.bottomBar.close();
  }

  end(): void {
    this.running = false;
    this.tick();
    this.clear();
  }

  succeed(): void {
    if (this.running) {
      this.end();
      console.log(`${chalk.green(ICON_SUCCESS_GREEN)} ${this.msg} - done!`);
    }
  }

  fail(): void {
    if (this.running) {
      this.end();
      console.error(`${chalk.red(ICON_FAILURE_RED)} ${this.msg} - failed!`);
    }
  }
}

export class TaskChain {
  protected currentTask?: Task;

  next(msg: string): Task {
    if (this.currentTask) {
      this.currentTask.succeed();
    }

    this.currentTask = new Task(msg);
    this.currentTask.start();

    return this.currentTask;
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
}
