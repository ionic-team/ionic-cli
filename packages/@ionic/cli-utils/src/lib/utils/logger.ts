import * as util from 'util';

import * as chalk from 'chalk';
import { ChalkChain } from 'chalk';

import { ILogger, LogLevel, LoggerOptions } from '../../definitions';
import { LOG_LEVELS } from '../../guards';
import { wordWrap } from './format';

export const LOGGER_STATUS_COLORS = new Map<LogLevel, ChalkChain>([
  ['debug', chalk.magenta.dim],
  ['info', chalk.gray],
  ['ok', chalk.green],
  ['warn', chalk.yellow],
  ['error', chalk.red],
  ['announce', chalk.cyan],
]);

export class Logger implements ILogger {

  public firstLineColored: LogLevel[] = ['warn', 'error', 'announce'];

  public readonly level: LogLevel;
  public readonly prefix: string | (() => string);
  public stream: NodeJS.WritableStream;

  constructor({ level = 'info', prefix = '', stream = process.stdout }: LoggerOptions) {
    this.level = level;
    this.prefix = prefix;
    this.stream = stream;
  }

  debug(msg: string | (() => string)): void {
    this.log('debug', msg);
  }

  info(msg: string | (() => string)): void {
    this.log('info', msg);
  }

  ok(msg: string | (() => string)): void {
    this.log('ok', msg);
  }

  warn(msg: string | (() => string)): void {
    this.log('warn', msg);
  }

  error(msg: string | (() => string)): void {
    this.log('error', msg);
  }

  announce(msg: string | (() => string)): void {
    this.log('announce', msg);
  }

  msg(msg: string | (() => string)): void {
    if (typeof msg === 'function') {
      msg = msg();
    }

    this.stream.write(this.enforceLF(msg));
  }

  nl(num: number = 1): void {
    this.stream.write(this.enforceLF('\n'.repeat(num)));
  }

  shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(this.level);
  }

  private enforceLF(str: string): string {
    return str.match(/[\r\n]$/) ? str : str + '\n';
  }

  private getStatusColor(level: LogLevel): ChalkChain {
    const color = LOGGER_STATUS_COLORS.get(level);

    if (!color) {
      return chalk.reset;
    }

    return color;
  }

  private log(level: LogLevel, msg: string | (() => string)): void {
    if (this.shouldLog(level)) {
      let prefix = this.prefix;

      if (typeof msg === 'function') {
        msg = msg();
      }

      if (prefix) {
        if (typeof prefix === 'function') {
          prefix = prefix();
        }

        msg = util.format(prefix, msg);
      }

      const color = this.getStatusColor(level);
      const status = color.bold.bgBlack;
      const b = chalk.dim;

      const msgLines = wordWrap(msg, { indentation: level.length + 3 }).split('\n');
      msg = msgLines.map((l, i) => {
        // We want these log messages to stand out a bit, so automatically
        // color the first line and separate the first line from the other
        // lines if the message is multi-lined.
        if (i === 0 && this.firstLineColored.includes(level)) {
          return color(l) + (msgLines.length > 1 ? '\n' : '');
        }

        return l;
      }).join('\n');

      msg = this.enforceLF(msg);

      this.stream.write(util.format.apply(util, [b('[') + status(level.toUpperCase()) + b(']'), msg]));
    }
  }
}
