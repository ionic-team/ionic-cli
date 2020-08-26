import logUpdate = require('log-update');
import { LogUpdate } from 'log-update';

import { Colors, NO_COLORS } from './colors';
import { ICON_FAILURE, ICON_SUCCESS, Spinner, TaskChain } from './tasks';
import { formatHrTime } from './utils';

export interface OutputStrategy {
  readonly stream: NodeJS.WritableStream;
  createTaskChain(): TaskChain;
}

export interface RedrawLine {
  redrawLine(msg?: string): void;
}

export interface StreamOutputStrategyOptions {
  readonly stream?: NodeJS.WritableStream;
  readonly colors?: Colors;
}

export class StreamOutputStrategy implements OutputStrategy {
  readonly stream: NodeJS.WritableStream;

  protected readonly colors: Colors;

  constructor({ stream = process.stdout, colors = NO_COLORS }: StreamOutputStrategyOptions) {
    this.stream = stream;
    this.colors = colors;
  }

  createTaskChain(): TaskChain {
    const { failure, success, weak } = this.colors;
    const chain = new TaskChain();

    chain.on('next', task => {
      task.on('end', result => {
        if (result.success) {
          this.stream.write(`${success(ICON_SUCCESS)} ${task.msg} ${weak(`in ${formatHrTime(result.elapsedTime)}`)}`);
        } else {
          this.stream.write(`${failure(ICON_FAILURE)} ${task.msg} ${failure(weak('- failed!'))}`);
        }
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

  constructor({ stream = process.stdout, colors = NO_COLORS }: LogUpdateOutputStrategyOptions = {}) {
    this.stream = stream;
    this.colors = colors;
    this.logUpdate = logUpdate.create(stream);
  }

  redrawLine(msg = ''): void {
    this.logUpdate(msg);
  }

  createTaskChain(): TaskChain {
    const { failure, strong, success, weak } = this.colors;
    const chain = new TaskChain({ taskOptions: { tickInterval: 50 } });

    chain.on('next', task => {
      task.on('end', result => {
        if (result.success) {
          this.stream.write(`${success(ICON_SUCCESS)} ${task.msg} ${weak(`in ${formatHrTime(result.elapsedTime)}`)}\n`);
        } else {
          this.stream.write(`${failure(ICON_FAILURE)} ${task.msg} ${failure(weak('- failed!'))}\n`);
        }
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
