import * as chalk from 'chalk';
import * as inquirer from 'inquirer';
import ui = inquirer.ui;

import { ICON_SUCCESS_GREEN, ICON_FAILURE_RED } from './format';

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
  public intervalId: NodeJS.Timer;
  public running: boolean = false;
  protected bottomBar: ui.BottomBar;
  private spinner: Spinner;

  constructor(public msg: string) {
    this.spinner = new Spinner();
    this.bottomBar = new inquirer.ui.BottomBar();
    TASKS.push(this);
  }

  start(): void {
    if (!this.running) {
      this.intervalId = setInterval(() => {
        this.bottomBar.updateBottomBar(`${chalk.bold(this.spinner.frame())} ${this.msg}`);
      }, 50);
    }

    this.running = true;
  }

  clear(): void {
    clearTimeout(this.intervalId);
    this.bottomBar.updateBottomBar('');
    this.bottomBar.close();
  }

  end(): void {
    this.clear();
    this.running = false;
  }

  succeed(): void {
    this.end();
    console.log(`${chalk.green(ICON_SUCCESS_GREEN)} ${this.msg} - done!`);
  }

  fail(): void {
    this.end();
    console.error(`${chalk.red(ICON_FAILURE_RED)} ${this.msg} - failed!`);
  }
}

export class TaskChain {
  protected currentTask?: Task;

  next(msg: string): this {
    if (this.currentTask) {
      this.currentTask.succeed();
    }

    this.currentTask = new Task(msg);
    this.currentTask.start();

    return this;
  }

  end(): this {
    if (this.currentTask) {
      this.currentTask.succeed();
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
