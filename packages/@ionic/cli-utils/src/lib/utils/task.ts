import chalk from 'chalk';

import { LOGGER_LEVELS, PromptModule, Task, TaskChain as BaseTaskChain, TaskOptions } from '@ionic/cli-framework';

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
  readonly prompt: PromptModule;

  constructor({ log, prompt }: { log: ILogger; prompt: PromptModule; }) {
    super({ log });
    this.prompt = prompt;
  }

  createTask(options: TaskOptions) {
    const task = super.createTask({ ...options, tickInterval: 50 });
    const spinner = new Spinner();

    task.on('tick', () => {
      if (this.log.level >= LOGGER_LEVELS.INFO) {
        const progress = task.progressRatio ? (task.progressRatio * 100).toFixed(2) : '';
        const frame = spinner.frame();

        this.prompt.updatePromptBar(`${chalk.bold(frame)} ${task.msg}${progress ? ' (' + chalk.bold(String(progress) + '%') + ')' : ''} `);
      }
    });

    task.on('clear', () => {
      if (this.log.level >= LOGGER_LEVELS.INFO) {
        this.prompt.updatePromptBar('');
      }
    });

    return task;
  }
}
