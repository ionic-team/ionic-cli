import chalk from 'chalk';

import { Colors } from '../definitions';

export const DEFAULT_COLORS: Colors = {
  strong: chalk.bold,
  weak: chalk.dim,
  input: chalk.green,
  debug: chalk.magenta,
  info: chalk.gray,
  warn: chalk.yellow,
  error: chalk.red,
};
