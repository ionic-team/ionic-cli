import * as util from 'util';
import * as stream from 'stream';

import chalk from 'chalk';
import { stripAnsi, wordWrap } from '@ionic/cli-framework/utils/format';
import { Chalk } from 'chalk';

import { ILogger, LogLevel, LogMsg, LogPrefix, LoggerOptions } from '../../definitions';
import { LOG_LEVELS } from '../../guards';

const LOGGER_ERROR_LEVELS: LogLevel[] = ['debug', 'warn', 'error', 'announce'];

export const LOGGER_STATUS_COLORS = new Map<LogLevel, Chalk>([
  ['debug', chalk.magenta.dim],
  ['info', chalk.gray],
  ['ok', chalk.green],
  ['warn', chalk.yellow],
  ['error', chalk.red],
  ['announce', chalk.cyan],
]);

const LOGGER_STATUS_DEFINED_COLORS = new Map<LogLevel, Chalk>([
  ['info', chalk.bold],
  ['warn', chalk.bold.yellow],
  ['error', chalk.bold.red],
  ['announce', chalk.bold.cyan],
]);

export class Logger implements ILogger {

  readonly level: LogLevel;
  readonly prefix: LogPrefix;
  outstream: NodeJS.WritableStream;
  errstream: NodeJS.WritableStream;
  readonly wrap: boolean;

  constructor({ level = 'info', prefix = '', outstream = process.stdout, errstream = process.stderr, wrap = true }: LoggerOptions) {
    this.level = level;
    this.prefix = prefix;
    this.outstream = outstream;
    this.errstream = errstream;
    this.wrap = wrap;
  }

  debug(msg: LogMsg): void {
    this._log('debug', msg);
  }

  info(msg: LogMsg): void {
    this._log('info', msg);
  }

  ok(msg: LogMsg): void {
    this._log('ok', msg);
  }

  warn(msg: LogMsg): void {
    this._log('warn', msg);
  }

  error(msg: LogMsg): void {
    this._log('error', msg);
  }

  announce(msg: LogMsg): void {
    this._log('announce', msg);
  }

  msg(msg: LogMsg): void {
    this._log('msg', msg);
  }

  rawmsg(msg: LogMsg): void {
    if (typeof msg === 'function') {
      msg = msg();
    }

    this.outstream.write(this.enforceLF(msg));
  }

  nl(num = 1): void {
    this.outstream.write(this.enforceLF('\n'.repeat(num)));
  }

  clone(opts: Partial<LoggerOptions> = {}) {
    const { level, prefix, outstream, errstream } = this;
    return new Logger({ level, prefix, outstream, errstream, ...opts });
  }

  createWriteStream() {
    const self = this;

    return new class extends stream.Writable {
      _write(chunk: any, encoding: string, callback: Function) {
        self.msg(chunk.toString());
        callback();
      }
    }();
  }

  shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(this.level);
  }

  private enforceLF(str: string): string {
    return str.match(/[\r\n]$/) ? str : str + '\n';
  }

  private getStatusColor(level: LogLevel): Chalk {
    const color = LOGGER_STATUS_COLORS.get(level);

    if (!color) {
      return chalk.reset;
    }

    return color;
  }

  private _log(level: LogLevel, msg: LogMsg): void {
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

      if (this.wrap) {
        const prefixIndentation = prefix ? stripAnsi(prefix).length + 1 : 0;
        const levelIndentation = level === 'msg' ? 0 : level.length + 3;
        const msgLines = wordWrap(msg, { indentation: prefixIndentation + levelIndentation }).split('\n');
        const definedColor = LOGGER_STATUS_DEFINED_COLORS.get(level);

        if (definedColor && msg.trim().includes('\n')) {
          msg = msgLines.map((l, i) => {
            // We want these log messages to stand out a bit, so automatically
            // color the first line and separate the first line from the other
            // lines if the message is multi-lined.
            if (i === 0) {
              return definedColor(l) + (msgLines.length > 1 ? '\n' : '');
            }

            return l;
          }).join('\n') + '\n\n';
        } else {
          msg = msgLines.join('\n');
        }

        msg = this.enforceLF(msg);
      }

      const fmtLevel = () => b('[') + status(level.toUpperCase()) + b(']');

      if (level !== 'msg') {
        msg = `${fmtLevel()} ${msg}`;
      }

      if (LOGGER_ERROR_LEVELS.includes(level)) {
        this.errstream.write(util.format(msg));
      } else {
        this.outstream.write(util.format(msg));
      }
    }
  }
}
