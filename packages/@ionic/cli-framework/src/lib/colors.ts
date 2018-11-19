import chalk from 'chalk';
import * as lodash from 'lodash';

import { LoggerLevel } from './logger';

export type ColorFunction = (...text: string[]) => string;
export type LoggerColors = { [L in LoggerLevel]: ColorFunction; };

export interface Colors {
  /**
   * Used to mark text as important. Comparable to HTML's <strong>.
   */
  strong: ColorFunction;

  /**
   * Used to mark text as less important.
   */
  weak: ColorFunction;

  /**
   * Used to mark text as input such as commands, inputs, options, etc.
   */
  input: ColorFunction;

  /**
   * Used to mark text as successful.
   */
  success: ColorFunction;

  /**
   * Used to mark text as failed.
   */
  failure: ColorFunction;

  log: LoggerColors;
}

export const DEFAULT_COLORS: Colors = Object.freeze({
  strong: chalk.bold,
  weak: chalk.dim,
  input: chalk.green,
  success: chalk.green,
  failure: chalk.red,
  log: Object.freeze({
    DEBUG: chalk.magenta,
    INFO: chalk.white,
    WARN: chalk.yellow,
    ERROR: chalk.red,
  }),
});

export const NO_COLORS: Colors = Object.freeze({
  strong: lodash.identity,
  weak: lodash.identity,
  input: lodash.identity,
  success: lodash.identity,
  failure: lodash.identity,
  log: Object.freeze({
    DEBUG: lodash.identity,
    INFO: lodash.identity,
    WARN: lodash.identity,
    ERROR: lodash.identity,
  }),
});
