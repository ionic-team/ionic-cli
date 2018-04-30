import * as util from 'util';
import { Writable } from 'stream';

import { Chalk } from 'chalk';

import { Colors, DEFAULT_COLORS } from './colors';
import { WordWrapOptions, stringWidth, wordWrap } from '../utils/format';
import { enforceLF } from '../utils/string';

export interface LogRecord {
  msg: string;
  logger: Logger;
  level?: LoggerLevelWeight;
}

export type LoggerLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
export type LoggerLevelWeight = number;
export type LoggerFormatter = (record: LogRecord) => string;

export const LOGGER_LEVELS: { readonly [L in LoggerLevel]: LoggerLevelWeight; } = Object.freeze({
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
});

export const LOGGER_LEVEL_NAMES: ReadonlyMap<LoggerLevelWeight, LoggerLevel> = new Map<LoggerLevelWeight, LoggerLevel>([
  [LOGGER_LEVELS.DEBUG, 'DEBUG'],
  [LOGGER_LEVELS.INFO, 'INFO'],
  [LOGGER_LEVELS.WARN, 'WARN'],
  [LOGGER_LEVELS.ERROR, 'ERROR'],
]);

export function getLoggerLevelName(level?: LoggerLevelWeight): LoggerLevel | undefined {
  if (level) {
    const levelName = LOGGER_LEVEL_NAMES.get(level);

    if (levelName) {
      return levelName;
    }
  }
}

export function getLoggerLevelColor(colors: Colors, level?: LoggerLevelWeight): Chalk | undefined {
  const levelName = getLoggerLevelName(level);

  if (levelName) {
    return colors.log[levelName];
  }
}

export interface LoggerHandler {
  formatter?: LoggerFormatter;
  handle(record: LogRecord): void;
}

export interface StreamHandlerOptions {
  readonly stream: NodeJS.WritableStream;
  readonly filter?: (record: LogRecord) => boolean;
  readonly formatter?: LoggerFormatter;
}

export class StreamHandler implements LoggerHandler {
  readonly stream: NodeJS.WritableStream;
  readonly filter?: (record: LogRecord) => boolean;
  formatter?: LoggerFormatter;

  constructor({ stream, filter, formatter }: StreamHandlerOptions) {
    this.stream = stream;
    this.filter = filter;
    this.formatter = formatter;
  }

  handle(record: LogRecord): void {
    if (this.filter && !this.filter(record)) {
      return;
    }

    const msg = this.formatter ? this.formatter(record) : record.msg;
    this.stream.write(enforceLF(msg));
  }
}

export const DEFAULT_LOGGER_HANDLERS: ReadonlySet<LoggerHandler> = new Set([
  new StreamHandler({ stream: process.stdout, filter: record => !record.level || record.level === LOGGER_LEVELS.INFO }),
  new StreamHandler({ stream: process.stderr, filter: record => !!record.level && record.level !== LOGGER_LEVELS.INFO }),
]);

export interface LoggerOptions {
  readonly handlers?: Set<LoggerHandler>;
  readonly level?: LoggerLevelWeight;
}

export class Logger {
  readonly handlers: Set<LoggerHandler>;
  level: LoggerLevelWeight;

  constructor({ level = LOGGER_LEVELS.INFO, handlers = new Set(DEFAULT_LOGGER_HANDLERS) }: LoggerOptions = {}) {
    this.level = level;
    this.handlers = handlers;
  }

  /**
   * Clone this logger, optionally overriding logger options.
   *
   * @param opts Logger options to override from this logger.
   */
  clone(opts: Partial<LoggerOptions> = {}): Logger {
    const { level, handlers } = this;
    return new Logger({ level, handlers, ...opts });
  }

  /**
   * Log a message as-is.
   *
   * @param msg The string to log.
   */
  msg(msg: string): void {
    this.log(this.createRecord(msg));
  }

  /**
   * Log a message using the `debug` logger level.
   *
   * @param msg The string to log.
   */
  debug(msg: string): void {
    this.log(this.createRecord(msg, LOGGER_LEVELS.DEBUG));
  }

  /**
   * Log a message using the `info` logger level.
   *
   * @param msg The string to log.
   */
  info(msg: string): void {
    this.log(this.createRecord(msg, LOGGER_LEVELS.INFO));
  }

  /**
   * Log a message using the `warn` logger level.
   *
   * @param msg The string to log.
   */
  warn(msg: string): void {
    this.log(this.createRecord(msg, LOGGER_LEVELS.WARN));
  }

  /**
   * Log a message using the `error` logger level.
   *
   * @param msg The string to log.
   */
  error(msg: string): void {
    this.log(this.createRecord(msg, LOGGER_LEVELS.ERROR));
  }

  createRecord(msg: string, level?: LoggerLevelWeight): LogRecord {
    return {
      // If the logger is used to quickly print something, let's pretty-print
      // it into a string.
      msg: util.format(msg),
      level,
      logger: this,
    };
  }

  /**
   * Log newlines using a logger output found via `level`.
   *
   * @param num The number of newlines to log.
   * @param level The logger level. If omitted, the default output is used.
   */
  nl(num = 1, level?: LoggerLevelWeight): void {
    this.log(this.createRecord('\n'.repeat(num), level));
  }

  /**
   * Log a record using a logger output found via `level`.
   */
  log(record: LogRecord): void {
    if (typeof record.level === 'number' && this.level > record.level) {
      return;
    }

    for (const handler of this.handlers) {
      handler.handle(record);
    }
  }

  createWriteStream(level?: LoggerLevelWeight): NodeJS.WritableStream {
    const self = this;

    return new class extends Writable {
      _write(chunk: any, encoding: string, callback: Function) {
        self.log(self.createRecord(chunk.toString(), level));
        callback();
      }
    }();
  }
}

export interface CreateTaggedFormatterOptions {
  prefix?: string;
  titleize?: boolean;
  wrap?: WordWrapOptions;
  colors?: Colors;
}

export function createTaggedFormatter({ colors = DEFAULT_COLORS, prefix = '', titleize, wrap }: CreateTaggedFormatterOptions = {}): LoggerFormatter {
  return ({ logger, msg, level }) => {
    const { strong, weak } = colors;

    const [ firstLine, ...lines ] = msg.split('\n');

    const levelName = getLoggerLevelName(level);
    const levelColor = getLoggerLevelColor(colors, level);

    const tag = (
      (prefix ? `${prefix}` : '') +
      (levelName ? `${weak('[')}${levelColor ? levelColor(levelName) : levelName}${weak(']')}` : '')
    );

    const title = titleize && lines.length > 0 ? `${strong(firstLine)}\n` : firstLine;
    const indentation = stringWidth(tag);

    return (
      (tag ? `${tag} ` : '') +
      (wrap ? wordWrap([title, ...lines].join('\n'), { indentation, ...wrap }) : [title, ...lines.map(l => `${' '.repeat(indentation)} ${l}`)].join('\n'))
    );
  };
}
