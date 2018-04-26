import * as util from 'util';
import { Writable } from 'stream';

import { Chalk } from 'chalk';
import * as lodash from 'lodash';

import { Colors } from '../definitions';
import { DEFAULT_COLORS, LOGGER_OUTPUT_COLORS } from './colors';
import { WordWrapOptions, stringWidth, wordWrap } from '../utils/format';
import { enforceLF } from '../utils/string';

export type LoggerLevel = 'debug' | 'info' | 'warn' | 'error';
export type LoggerFormatter = (msg: string, context: { logger: Logger; output: LoggerOutput; level?: LoggerLevel }) => string;

export class LoggerOutput {
  constructor(
    /**
     * Output is written to this stream.
     */
    public stream: NodeJS.WritableStream,

    /**
     * Assign a weight to this output.
     *
     * If a logger output has a lower weight than the logger to which they're
     * attached, the output is not used.
     */
    public weight = Infinity,

    /**
     * Assign a color to be associated with this output.
     */
    public color?: Chalk
  ) {}
}

export type LoggerOutputs = { [L in LoggerLevel]?: LoggerOutput; };

export const DEFAULT_OUTPUT = new LoggerOutput(process.stdout);

export const LOGGER_OUTPUTS: LoggerOutputs = {
  debug: new LoggerOutput(process.stderr, 10, LOGGER_OUTPUT_COLORS.debug),
  info: new LoggerOutput(process.stdout, 20, LOGGER_OUTPUT_COLORS.info),
  warn: new LoggerOutput(process.stderr, 30, LOGGER_OUTPUT_COLORS.warn),
  error: new LoggerOutput(process.stderr, 40, LOGGER_OUTPUT_COLORS.error),
};

export interface LoggerOptions {
  /**
   * Assign a weight to this logger.
   *
   * If a logger has a lower weight than the logger output it's about to use,
   * it will not log.
   */
  readonly weight?: number;
  readonly output?: LoggerOutput;
  readonly outputs?: LoggerOutputs;
  readonly colors?: Colors;
  readonly formatter?: LoggerFormatter;
}

export class Logger {
  weight: number;
  formatter?: LoggerFormatter;

  readonly output: LoggerOutput;
  readonly outputs: LoggerOutputs;
  readonly colors: Colors;

  constructor({ weight = Infinity, output = DEFAULT_OUTPUT, outputs = LOGGER_OUTPUTS, colors = DEFAULT_COLORS, formatter }: LoggerOptions = {}) {
    this.weight = weight;
    this.output = output;
    this.outputs = outputs;
    this.colors = colors;
    this.formatter = formatter;
  }

  /**
   * Write a string as-is directly to the default logger output.
   *
   * @param msg The string to log.
   */
  raw(msg: string): void {
    this.output.stream.write(msg);
  }

  /**
   * Log a message using the `debug` logger output.
   *
   * @param msg The string to log.
   */
  debug(msg: string): void {
    this.log(msg, 'debug');
  }

  /**
   * Log a message using the `info` logger output.
   *
   * @param msg The string to log.
   */
  info(msg: string): void {
    this.log(msg, 'info');
  }

  /**
   * Log a message using the `warn` logger output.
   *
   * @param msg The string to log.
   */
  warn(msg: string): void {
    this.log(msg, 'warn');
  }

  /**
   * Log a message using the `error` logger output.
   *
   * @param msg The string to log.
   */
  error(msg: string): void {
    this.log(msg, 'error');
  }

  /**
   * Log newlines using a logger output found via `level`.
   *
   * @param num The number of newlines to log.
   * @param level The logger level. If omitted, the default output is used.
   */
  nl(num = 1, level?: LoggerLevel): void {
    this.log('\n'.repeat(num), level, false);
  }

  /**
   * Log a message using a logger output found via `level`.
   *
   * @param msg The string to log.
   * @param level The logger level. If omitted, the default output is used.
   * @param format Run this log message through the formatter.
   */
  log(msg: string, level?: LoggerLevel, format = true): void {
    const output = this.findOutput(level);

    if (output.weight > this.weight) {
      return;
    }

    // If the logger is used to quickly print something, let's pretty-print it
    // into a string.
    msg = util.format(msg);

    if (format) {
      const formatter: LoggerFormatter = this.formatter ? this.formatter : lodash.identity;
      msg = formatter(msg, { logger: this, output, level });
    }

    output.stream.write(enforceLF(msg));
  }

  /**
   * Create a NodeJS writable stream at the given `level`.
   *
   * @param level The logger level. If omitted, the default output is used.
   */
  createWriteStream(level?: LoggerLevel): NodeJS.WritableStream {
    const self = this;

    return new class extends Writable {
      _write(chunk: any, encoding: string, callback: Function) {
        self.log(chunk.toString(), level);
        callback();
      }
    }();
  }

  /**
   * Return `true` if the logger has output for a given `level`, `false`
   * otherwise.
   *
   * @param level The logger level. If omitted, this method returns `true`
   *              because the logger has a default output.
   */
  hasOutput(level?: LoggerLevel): boolean {
    if (!level) {
      return true;
    }

    return typeof this.outputs[level] !== 'undefined';
  }

  /**
   * Find a logger output with the given `level`.
   *
   * @param level The logger level. If omitted, the default output is returned.
   */
  findOutput(level?: LoggerLevel): LoggerOutput {
    if (level) {
      const output = this.outputs[level];

      if (output) {
        return output;
      }
    }

    return this.output;
  }
}

export type LoggerFormatters = { [F in 'tagged']: LoggerFormatter; };

export const LOGGER_FORMATTERS: LoggerFormatters = {
  tagged: createTaggedFormatter(),
};

export interface CreateTaggedFormatterOptions {
  title?: boolean;
  wrap?: WordWrapOptions;
}

export function createTaggedFormatter({ title, wrap }: CreateTaggedFormatterOptions = {}): LoggerFormatter {
  return (msg, { logger, output, level }) => {
    const { strong, weak } = logger.colors;
    const c: (s: string) => string = output.color ? output.color : lodash.identity;
    const tag = level ? `${weak('[')}${c(level.toUpperCase())}${weak(']')}` : '';
    const indentation = stringWidth(tag);
    const [ firstLine, ...lines ] = msg.split('\n');
    const first = title && lines.length > 0 ? `${strong(firstLine)}\n` : firstLine;

    return (
      (tag ? `${tag} ` : '') +
      (wrap ? wordWrap([first, ...lines].join('\n'), { indentation, ...wrap }) : [first, ...lines.map(l => `${' '.repeat(indentation)} ${l}`)].join('\n'))
    );
  };
}
