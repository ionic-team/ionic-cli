import * as path from 'path';

import * as chalk from 'chalk';

export const ICON_SUCCESS = '✔';
export const ICON_FAILURE = '✖';

export const ICON_SUCCESS_GREEN = chalk.green(ICON_SUCCESS);
export const ICON_FAILURE_RED = chalk.red(ICON_FAILURE);

export function prettyPath(p: string): string {
  return process.cwd() === path.dirname(p) ? path.basename(p) : p;
}

export function indent(n: number = 4): string {
  return new Array(n).fill(' ').reduce((a, b) => a + b);
}
