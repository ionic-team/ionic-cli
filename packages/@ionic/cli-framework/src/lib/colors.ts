import chalk, { Chalk } from 'chalk';

import { LoggerLevel } from './logger';

export type LoggerColors = { [L in LoggerLevel]: Chalk; };

export interface Colors {
  /**
   * Used to mark text as important. Comparable to HTML's <strong>.
   */
  strong: Chalk;

  /**
   * Used to mark text as less important.
   */
  weak: Chalk;

  /**
   * Used to mark text as input such as commands, inputs, options, etc.
   */
  input: Chalk;

  /**
   * Used to mark text as successful.
   */
  success: Chalk;

  /**
   * Used to mark text as failed.
   */
  failure: Chalk;

  log: LoggerColors;
}

export const DEFAULT_LOGGER_COLORS: LoggerColors = Object.freeze({
  DEBUG: chalk.magenta,
  INFO: chalk.white,
  WARN: chalk.yellow,
  ERROR: chalk.red,
});

export const DEFAULT_COLORS: Colors = Object.freeze({
  strong: chalk.bold,
  weak: chalk.dim,
  input: chalk.green,
  success: chalk.green,
  failure: chalk.red,
  log: DEFAULT_LOGGER_COLORS,
});
