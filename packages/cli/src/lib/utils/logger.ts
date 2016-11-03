import * as util from 'util';

import * as chalk from 'chalk';

import { ILogger, LogLevel, LoggerOptions } from '../../definitions';
import { indent } from './format';

const LEVELS: LogLevel[] = ['debug', 'info', 'ok', 'warn', 'error'];

export class Logger implements ILogger {

  public level: LogLevel;
  public prefix: string;

  constructor(opts: LoggerOptions = {}) {
    this.level = opts.level || 'info';
    this.prefix = opts.prefix || '';
  }

  public debug(...args: any[]): void {
    this.log('debug', ...args);
  }

  public info(...args: any[]): void {
    this.log('info', ...args);
  }

  public ok(...args: any[]): void {
    this.log('ok', ...args);
  }

  public warn(...args: any[]): void {
    this.log('warn', ...args);
  }

  public error(...args: any[]): void {
    this.log('error', ...args);
  }

  public msg(): void {
    console.log.apply(console, arguments);
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVELS.indexOf(level) >= LEVELS.indexOf(this.level);
  }

  private log(level: LogLevel, ...args: any[]): void {
    if (this.shouldLog(level)) {
      let prefix = this.prefix;

      if (prefix) {
        args[0] = util.format(prefix, args[0]);
      }

      if (['ok', 'warn', 'error'].indexOf(level) !== -1) {
        for (let [i, arg] of args.entries()) {
          if (typeof arg === 'string') {
            args[i] = arg.split('\n').map((l, i) => i > 0 ? `${indent(level.length + 2)} ${l}` : l).join('\n');
          }
        }
      }

      const status = chalk.bold.bgBlack;
      const b = chalk.dim;

      switch (level) {
      case 'debug':
      case 'info':
        console.info(util.format.apply(util, args));
        break;
      case 'ok':
        console.info(util.format.apply(util, [b('[') + status.green('OK') + b(']'), ...args]));
        break;
      case 'warn':
        console.warn(util.format.apply(util, [b('[') + status.yellow('WARN') + b(']'), ...args]));
        break;
      case 'error':
        console.error(util.format.apply(util, [b('[') + status.red('ERROR') + b(']'), ...args]));
        break;
      }
    }
  }
}
