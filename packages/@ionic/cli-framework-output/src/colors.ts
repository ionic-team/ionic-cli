import { LoggerLevel } from './logger';
import { identity } from './utils';

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

  /**
   * Used to mark text as ancillary or supportive.
   */
  ancillary: ColorFunction;

  log: LoggerColors;
}

export const NO_COLORS: Colors = Object.freeze({
  strong: identity,
  weak: identity,
  input: identity,
  success: identity,
  failure: identity,
  ancillary: identity,
  log: Object.freeze({
    DEBUG: identity,
    INFO: identity,
    WARN: identity,
    ERROR: identity,
  }),
});
