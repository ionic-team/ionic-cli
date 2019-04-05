import { ColorFunction, Colors, DEFAULT_COLORS } from '@ionic/cli-framework';
import chalk from 'chalk';

export const strong: ColorFunction = chalk.bold;
export const weak: ColorFunction = chalk.dim;
export const input: ColorFunction = chalk.green;
export const ancillary: ColorFunction = chalk.cyan;
export const success: ColorFunction = chalk.green;
export const failure: ColorFunction = chalk.red;

export const COLORS: Colors = {
  ...DEFAULT_COLORS,
  strong,
  weak,
  input,
  ancillary,
  success,
  failure,
};
