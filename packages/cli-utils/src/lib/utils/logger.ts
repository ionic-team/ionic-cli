import * as util from 'util';

import * as chalk from 'chalk';
import { ChalkStyle } from 'chalk';

import { ILogger, LogLevel, LoggerOptions } from '../../definitions';
import { LOG_LEVELS, isLogLevel } from '../../guards';
import { FatalException } from '../errors';
import { indent, wordWrap } from './format';

export const LOGGER_STATUS_COLORS = new Map<LogLevel, ChalkStyle>([
  ['debug', chalk.magenta.dim],
  ['info', chalk.gray],
  ['ok', chalk.green],
  ['warn', chalk.yellow],
  ['error', chalk.red],
]);

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

  private getStatusColor(level: LogLevel): ChalkStyle {
    const color = LOGGER_STATUS_COLORS.get(level);

    if (!color) {
      return chalk;
    }

    return color;
  }

  private log(level: LogLevel, msg: string): void {
    if (this.shouldLog(level)) {
      let prefix = this.prefix;

      if (prefix) {
        msg = util.format(prefix, msg);
      }

      msg = wordWrap(msg, { indentation: level.length + 3 }).split('\n').join('\n');
      msg = this.enforceLF(msg);

      const color = this.getStatusColor(level);
      const status = color.bold.bgBlack;
      const b = chalk.dim;

      this.stream.write(util.format.apply(util, [b('[') + status(level.toUpperCase()) + b(']'), msg]));
    }
  }
}
