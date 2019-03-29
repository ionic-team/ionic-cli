import * as Debug from 'debug';
import * as ζinquirer from 'inquirer';
import LogUpdateModule, { LogUpdate } from 'log-update';
import { Writable } from 'stream';

import { Colors, DEFAULT_COLORS } from './colors';
import { ICON_FAILURE, ICON_SUCCESS, Spinner, TaskChain } from './tasks';

const debug = Debug('ionic:cli-framework:lib:output');

export interface OutputStrategy {
  readonly stream: NodeJS.WritableStream;
  createTaskChain(): TaskChain;
}

export interface RedrawLine {
  redrawLine(msg?: string): void;
}

export interface StreamOutputStrategyOptions {
  readonly stream: NodeJS.WritableStream;
  readonly colors?: Colors;
}

export class StreamOutputStrategy implements OutputStrategy {
  readonly stream: NodeJS.WritableStream;

  protected readonly colors: Colors;

  constructor({ stream = process.stdout, colors = DEFAULT_COLORS }: StreamOutputStrategyOptions) {
    this.stream = stream;
    this.colors = colors;
  }

  createTaskChain(): TaskChain {
    const { failure, success } = this.colors;
    const chain = new TaskChain();

    chain.on('next', task => {
      task.on('success', () => {
        this.stream.write(`${success(ICON_SUCCESS)} ${task.msg} - done!`);
      });

      task.on('failure', () => {
        this.stream.write(`${failure(ICON_FAILURE)} ${task.msg} - failed!`);
      });
    });

    return chain;
  }
}

export interface LogUpdateOutputStrategyOptions {
  readonly stream?: NodeJS.WritableStream;
  readonly colors?: Colors;
}

export class LogUpdateOutputStrategy implements OutputStrategy, RedrawLine {
  readonly stream: NodeJS.WritableStream;

  protected readonly colors: Colors;
  protected readonly logUpdate: LogUpdate;

  constructor({ stream = process.stdout, colors = DEFAULT_COLORS }: LogUpdateOutputStrategyOptions = {}) {
    this.stream = stream;
    this.colors = colors;
    this.logUpdate = LogUpdateModule.create(stream as Writable); // https://github.com/sindresorhus/log-update/pull/38
  }

  redrawLine(msg = ''): void {
    this.logUpdate(msg);
  }

  createTaskChain(): TaskChain {
    const { failure, strong, success } = this.colors;
    const chain = new TaskChain({ taskOptions: { tickInterval: 50 } });

    chain.on('next', task => {
      task.on('success', () => {
        this.stream.write(`${success(ICON_SUCCESS)} ${task.msg} - done!\n`);
      });

      task.on('failure', () => {
        this.stream.write(`${failure(ICON_FAILURE)} ${task.msg} - failed!\n`);
      });

      const spinner = new Spinner();

      task.on('tick', () => {
        const progress = task.progressRatio ? (task.progressRatio * 100).toFixed(2) : '';
        const frame = spinner.frame();

        this.redrawLine(`${strong(frame)} ${task.msg}${progress ? ' (' + strong(String(progress) + '%') + ')' : ''} `);
      });

      task.on('clear', () => {
        this.logUpdate.clear();
      });
    });

    chain.on('end', () => {
      this.logUpdate.done();
    });

    return chain;
  }
}

export interface BottomBarOutputStrategyOptions {
  readonly BottomBar: typeof ζinquirer.ui.BottomBar;
  readonly input?: NodeJS.ReadableStream;
  readonly output?: NodeJS.WritableStream;
  readonly colors?: Colors;
}

export class BottomBarOutputStrategy implements OutputStrategy, RedrawLine {
  protected bottomBar?: ζinquirer.ui.BottomBar;

  protected readonly BottomBar: typeof ζinquirer.ui.BottomBar;
  protected readonly rawinput: NodeJS.ReadableStream;
  protected readonly rawoutput: NodeJS.WritableStream;
  protected readonly colors: Colors;

  constructor({ BottomBar, input = process.stdin, output = process.stdout, colors = DEFAULT_COLORS }: BottomBarOutputStrategyOptions) {
    this.BottomBar = BottomBar;
    this.rawinput = input;
    this.rawoutput = output;
    this.colors = colors;
  }

  get stream(): NodeJS.WritableStream {
    const bottomBar = this.get();
    return bottomBar.log;
  }

  redrawLine(msg = ''): void {
    const bottomBar = this.get();
    bottomBar.updateBottomBar(msg);
  }

  get(): typeof ζinquirer.ui.BottomBar {
    if (!this.bottomBar) {
      this.bottomBar = new this.BottomBar({ input: this.rawinput, output: this.rawoutput } as any);

      try {
        // the mute() call appears to be necessary, otherwise when answering
        // inquirer prompts upon pressing enter, a copy of the prompt is
        // printed to the screen and looks gross
        (this.bottomBar as any).rl.output.mute();
      } catch (e) {
        debug('Error while muting bottomBar output: %o', e);
      }
    }

    return this.bottomBar;
  }

  open(): void {
    this.get();
  }

  close(): void {
    if (this.bottomBar) {
      // instantiating inquirer.ui.BottomBar hangs, so when close() is called,
      // close BottomBar streams
      this.bottomBar.close();
      this.bottomBar = undefined;
    }
  }

  createTaskChain(): TaskChain {
    const { failure, strong, success } = this.colors;
    const chain = new TaskChain({ taskOptions: { tickInterval: 50 } });

    this.open();

    chain.on('next', task => {
      this.open();

      task.on('success', () => {
        this.stream.write(`${success(ICON_SUCCESS)} ${task.msg} - done!`);
      });

      task.on('failure', () => {
        this.stream.write(`${failure(ICON_FAILURE)} ${task.msg} - failed!`);
      });

      const spinner = new Spinner();

      task.on('tick', () => {
        const progress = task.progressRatio ? (task.progressRatio * 100).toFixed(2) : '';
        const frame = spinner.frame();

        this.redrawLine(`${strong(frame)} ${task.msg}${progress ? ' (' + strong(String(progress) + '%') + ')' : ''} `);
      });

      task.on('clear', () => {
        this.redrawLine('');
      });
    });

    chain.on('end', () => {
      this.close();
    });

    return chain;
  }
}
