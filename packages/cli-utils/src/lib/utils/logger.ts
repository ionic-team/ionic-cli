import * as util from 'util';

import * as chalk from 'chalk';

import { ILogger, LogLevel, LoggerOptions } from '../../definitions';
import { isLogLevel, LOG_LEVELS } from '../../guards';
import { FatalException } from '../errors';
import { indent } from './format';

export class Logger implements ILogger {

  protected _level: LogLevel;
  public prefix: string;
  public stream: NodeJS.WritableStream;

  constructor({ level = 'info', prefix = '', stream = process.stdout }: LoggerOptions) {
    this.level = level;
    this.prefix = prefix;
    this.stream = stream;
  }

  get level(): LogLevel {
    return this._level;
  }

  set level(v: LogLevel) {
    const s = v.toLowerCase();

    if (!isLogLevel(s)) {
      throw new FatalException(`Invalid log level '${chalk.bold(v)}' (choose from: ${LOG_LEVELS.map(l => chalk.bold(l)).join(', ')})`);
    }

    this._level = s;
  }

  debug(msg: string): void {
    this.log('debug', msg);
  }

  info(msg: string): void {
    this.log('info', msg);
  }

  ok(msg: string): void {
    this.log('ok', msg);
  }

  warn(msg: string): void {
    this.log('warn', msg);
  }

  error(msg: string): void {
    this.log('error', msg);
  }

  msg(msg: string): void {
    this.stream.write(msg);
  }

  nl(num: number = 1): void {
    this.stream.write('\n'.repeat(num));
  }

  shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(this.level);
  }

  private log(level: LogLevel, ...args: any[]): void {
    if (this.shouldLog(level)) {
      let prefix = this.prefix;

      if (prefix) {
        args[0] = util.format(prefix, args[0]);
      }

      for (let [i, arg] of args.entries()) {
        if (typeof arg === 'string') {
          args[i] = arg.split('\n').map((l, i) => i > 0 ? `${indent(level.length + 2)} ${l}` : l).join('\n');
        }
      }

      const status = chalk.bold.bgBlack;
      const b = chalk.dim;

      switch (level) {
      case 'debug':
        this.stream.write(util.format.apply(util, [b('[') + status.magenta('DEBUG') + b(']'), ...args]));
      break;
      case 'info':
        this.stream.write(util.format.apply(util, [b('[') + status.gray('INFO') + b(']'), ...args]));
        break;
      case 'ok':
        this.stream.write(util.format.apply(util, [b('[') + status.green('OK') + b(']'), ...args]));
        break;
      case 'warn':
        this.stream.write(util.format.apply(util, [b('[') + status.yellow('WARN') + b(']'), ...args]));
        break;
      case 'error':
        this.stream.write(util.format.apply(util, [b('[') + status.red('ERROR') + b(']'), ...args]));
        break;
      }
    }
  }
}
