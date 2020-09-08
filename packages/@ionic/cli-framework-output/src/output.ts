import { Cursor, EscapeCode } from '@ionic/utils-terminal';

import { Colors, NO_COLORS } from './colors';
import { ICON_FAILURE, ICON_SUCCESS, Spinner, TaskChain } from './tasks';
import { formatHrTime } from './utils';

export interface OutputStrategy {
  readonly stream: NodeJS.WritableStream;
  readonly colors: Colors;
  write(msg: string): boolean;
  createTaskChain(): TaskChain;
}

export interface StreamOutputStrategyOptions {
  readonly stream?: NodeJS.WritableStream;
  readonly colors?: Colors;
}

export class StreamOutputStrategy implements OutputStrategy {
  readonly stream: NodeJS.WritableStream;
  readonly colors: Colors;

  constructor({ stream = process.stdout, colors = NO_COLORS }: StreamOutputStrategyOptions) {
    this.stream = stream;
    this.colors = colors;
  }

  write(msg: string): boolean {
    return this.stream.write(msg);
  }

  createTaskChain(): TaskChain {
    const { failure, success, weak } = this.colors;
    const chain = new TaskChain();

    chain.on('next', task => {
      task.on('end', result => {
        if (result.success) {
          this.write(`${success(ICON_SUCCESS)} ${task.msg} ${weak(`in ${formatHrTime(result.elapsedTime)}`)}\n`);
        } else {
          this.write(`${failure(ICON_FAILURE)} ${task.msg} ${failure(weak('- failed!'))}\n`);
        }
      });
    });

    return chain;
  }
}

export interface TTYOutputStrategyOptions extends StreamOutputStrategyOptions {
  readonly stream?: NodeJS.WriteStream;
}

export class TTYOutputStrategy extends StreamOutputStrategy implements OutputStrategy {
  readonly stream: NodeJS.WriteStream;

  protected readonly redrawer: TTYOutputRedrawer;

  constructor({ stream = process.stdout, colors = NO_COLORS }: TTYOutputStrategyOptions = {}) {
    super({ stream, colors });
    this.stream = stream;
    this.redrawer = new TTYOutputRedrawer({ stream });
  }

  createTaskChain(): TaskChain {
    const { failure, strong, success, weak } = this.colors;
    const chain = new TaskChain({ taskOptions: { tickInterval: 50 } });

    chain.on('next', task => {
      task.on('end', result => {
        if (result.success) {
          this.write(`${success(ICON_SUCCESS)} ${task.msg} ${weak(`in ${formatHrTime(result.elapsedTime)}`)}\n`);
        } else {
          this.write(`${failure(ICON_FAILURE)} ${task.msg} ${failure(weak('- failed!'))}\n`);
        }
      });

      const spinner = new Spinner();

      task.on('tick', () => {
        const progress = task.progressRatio ? (task.progressRatio * 100).toFixed(2) : '';
        const frame = spinner.frame();

        this.redrawer.redraw(`${strong(frame)} ${task.msg}${progress ? ' (' + strong(String(progress) + '%') + ')' : ''} `);
      });

      task.on('clear', () => {
        this.redrawer.clear();
      });
    });

    chain.on('end', () => {
      this.redrawer.end();
    });

    return chain;
  }
}

export interface TTYOutputRedrawerOptions {
  readonly stream?: NodeJS.WriteStream;
}

export class TTYOutputRedrawer {
  readonly stream: NodeJS.WriteStream;

  constructor({ stream = process.stdout }: TTYOutputRedrawerOptions) {
    this.stream = stream;
  }

  get width(): number {
    return this.stream.columns || 80;
  }

  redraw(msg: string) {
    Cursor.hide();
    this.stream.write(EscapeCode.eraseLines(1) + msg.replace(/[\r\n]+$/, ''));
  }

  clear() {
    this.stream.write(EscapeCode.eraseLines(1));
  }

  end() {
    Cursor.show();
  }
}
