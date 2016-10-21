import * as chalk from 'chalk';
import * as inquirer from 'inquirer';
import ui = inquirer.ui;

const SUCCESS = '✔';
const FAILURE = '✖';
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

export class Task {
  public intervalId: NodeJS.Timer;
  protected bottomBar: ui.BottomBar;
  protected started: boolean = false;
  private spinner: Spinner;

  constructor(public msg: string) {
    this.spinner = new Spinner();
    this.bottomBar = new inquirer.ui.BottomBar();
  }

  start(): void {
    if (!this.started) {
      this.intervalId = setInterval(() => {
        this.bottomBar.updateBottomBar(`${chalk.bold(this.spinner.frame())} ${this.msg}`);
      }, 50);
    }
  }

  clear(): void {
    clearTimeout(this.intervalId);
    this.bottomBar.updateBottomBar('');
    this.bottomBar.close();
  }

  succeed(): void {
    this.clear();
    console.log(`${chalk.green(SUCCESS)} ${this.msg} - done!`);
  }

  fail(): void {
    this.clear();
    console.error(`${chalk.red(FAILURE)} ${this.msg} - failed!`);
  }
}

export class TaskChain {
  protected currentTask?: Task;

  next(msg: string) {
    if (this.currentTask) {
      this.currentTask.succeed();
    }

    this.currentTask = new Task(msg);
    this.currentTask.start();
  }

  end() {
    if (this.currentTask) {
      this.currentTask.succeed();
    }
  }

  fail() {
    if (this.currentTask) {
      this.currentTask.fail();
    }
  }
}
