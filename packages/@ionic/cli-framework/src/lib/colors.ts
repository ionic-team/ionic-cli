import chalk from 'chalk';
import * as lodash from 'lodash';

import { MetadataGroup } from '../definitions';

import { LoggerLevel } from './logger';

export type ColorFunction = (...text: string[]) => string;
export type LoggerColors = { [L in LoggerLevel]: ColorFunction; };
export type HelpGroupColors = { [G in Exclude<MetadataGroup, MetadataGroup.HIDDEN | MetadataGroup.ADVANCED>]: ColorFunction; };

export interface HelpColors {
  /**
   * Used to color the section titles in help output.
   */
  title: ColorFunction;

  group: HelpGroupColors;
}

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

  help: HelpColors;
}

export const DEFAULT_COLORS: Colors = Object.freeze({
  strong: chalk.bold,
  weak: chalk.dim,
  input: chalk.cyan,
  success: chalk.green,
  failure: chalk.red,
  ancillary: chalk.cyan,
  log: Object.freeze({
    DEBUG: chalk.magenta,
    INFO: chalk.white,
    WARN: chalk.yellow,
    ERROR: chalk.red,
  }),
  help: Object.freeze({
    title: chalk.bold,
    group: Object.freeze({
      [MetadataGroup.DEPRECATED]: chalk.yellow,
      [MetadataGroup.BETA]: chalk.magenta,
      [MetadataGroup.EXPERIMENTAL]: chalk.red,
      [MetadataGroup.PAID]: chalk.green,
    }),
  }),
});

export const NO_COLORS: Colors = Object.freeze({
  strong: lodash.identity,
  weak: lodash.identity,
  input: lodash.identity,
  success: lodash.identity,
  failure: lodash.identity,
  ancillary: lodash.identity,
  log: Object.freeze({
    DEBUG: lodash.identity,
    INFO: lodash.identity,
    WARN: lodash.identity,
    ERROR: lodash.identity,
  }),
  help: Object.freeze({
    title: lodash.identity,
    group: Object.freeze({
      [MetadataGroup.DEPRECATED]: lodash.identity,
      [MetadataGroup.BETA]: lodash.identity,
      [MetadataGroup.EXPERIMENTAL]: lodash.identity,
      [MetadataGroup.PAID]: lodash.identity,
    }),
  }),
});
