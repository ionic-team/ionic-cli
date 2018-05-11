import chalk from 'chalk';
import * as inquirerType from 'inquirer';
import ui = inquirerType.ui;

import { LOGGER_LEVELS, Task, TaskChain as BaseTaskChain, TaskOptions } from '@ionic/cli-framework';

import { ILogger } from '../../definitions';

const isWindows = process.platform === 'win32';

const ICON_SUCCESS = isWindows ? '√' : '✔';
const ICON_FAILURE = isWindows ? '×' : '✖';

const SPINNER_FRAMES = isWindows ?
  ['-', '\\', '|', '/'] :
  ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

class Spinner {
  i = 0;

  constructor(public frames: string[] = SPINNER_FRAMES) {}

  frame(): string {
    return this.frames[this.i = ++this.i % this.frames.length];
  }
}

export class TaskChain extends BaseTaskChain {
  log: ILogger;

  constructor({ log }: { log: ILogger; }) {
    super();
    this.log = log;
  }

  createTask(options: TaskOptions): Task {
    const task = new Task(options);

    task.on('success', () => {
      if (this.log.level >= LOGGER_LEVELS.INFO) {
        this.log.msg(`${chalk.green(ICON_SUCCESS)} ${task.msg} - done!`);
      }
    });

    task.on('failure', () => {
      if (this.log.level >= LOGGER_LEVELS.INFO) {
        this.log.msg(`${chalk.red(ICON_FAILURE)} ${task.msg} - failed!`);
      }
    });

    return task;
  }
}

export class InteractiveTaskChain extends TaskChain {
  bottomBar: ui.BottomBar;

  constructor({ log, bottomBar }: { log: ILogger; bottomBar: ui.BottomBar; }) {
    super({ log });
    this.bottomBar = bottomBar;
  }

  createTask(options: TaskOptions) {
    const task = super.createTask({ ...options, tickInterval: 50 });
    const spinner = new Spinner();

    task.on('tick', () => {
      if (this.log.level >= LOGGER_LEVELS.INFO) {
        const progress = task.progressRatio ? (task.progressRatio * 100).toFixed(2) : '';
        const frame = spinner.frame();

        this.bottomBar.updateBottomBar(`${chalk.bold(frame)} ${task.msg}${progress ? ' (' + chalk.bold(String(progress) + '%') + ')' : ''} `);
      }
    });

    task.on('clear', () => {
      if (this.log.level >= LOGGER_LEVELS.INFO) {
        this.bottomBar.updateBottomBar('');
      }
    });

    return task;
  }
}
