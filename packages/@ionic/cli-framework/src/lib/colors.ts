import chalk from 'chalk';
import { Chalk } from 'chalk';

import { LoggerLevel } from './logger';

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
}

export const DEFAULT_COLORS: Colors = {
  strong: chalk.bold,
  weak: chalk.dim,
  input: chalk.green,
};

export const LOGGER_OUTPUT_COLORS: { [L in LoggerLevel]: Chalk; } = {
  debug: chalk.magenta,
  info: chalk.gray,
  warn: chalk.yellow,
  error: chalk.red,
};
