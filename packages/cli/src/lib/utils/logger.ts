import * as util from 'util';
import { ILogger, LoggerOptions } from '../../definitions';

const LEVELS = ['trace', 'debug', 'info', 'warn', 'error'];

export class Logger implements ILogger {

  constructor(public opts: LoggerOptions = { level: 'info', prefix: '' }) {}

  public trace(...args: any[]): void {
    this.log('trace', ...args);
  }

  public debug(...args: any[]): void {
    this.log('debug', ...args);
  }

  public info(...args: any[]): void {
    this.log('info', ...args);
  }

  public warn(...args: any[]): void {
    this.log('warn', ...args);
  }

  public error(...args: any[]): void {
    this.log('error', ...args);
  }

  public msg(): void {
    console.log(arguments);
  }

  private shouldLog(level: string): boolean {
    return LEVELS.indexOf(level) >= LEVELS.indexOf(this.opts.level);
  }

  private log(level: string, ...args: any[]): void {
    if (this.shouldLog) {
      let prefix = this.opts.prefix;

      if (prefix) {
        if (typeof prefix === 'function') {
          prefix = prefix();
        }
        args[0] = util.format(prefix, args[0]);
      }

      switch (level) {
      case 'trace':
      case 'debug':
      case 'info':
        console.info(util.format.apply(util, args));
        break;
      case 'warn':
        console.warn(util.format.apply(util, args));
        break;
      case 'error':
        console.error(util.format.apply(util, args));
        break;
      }
    }
  }
}
