import { ColorFunction, Colors as BaseColors } from '@ionic/cli-framework-output';
import chalk from 'chalk';
import * as lodash from 'lodash';

import { MetadataGroup } from '../definitions';

export { ColorFunction, LoggerColors } from '@ionic/cli-framework-output';
export type HelpGroupColors = { [G in Exclude<MetadataGroup, MetadataGroup.HIDDEN | MetadataGroup.ADVANCED>]: ColorFunction; };

export interface HelpColors {
  /**
   * Used to color the section titles in help output.
   */
  title: ColorFunction;

  group: HelpGroupColors;
}

export interface Colors extends BaseColors {
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
