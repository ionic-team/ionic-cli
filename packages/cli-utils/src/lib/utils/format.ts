import * as os from 'os';
import * as path from 'path';

import * as chalk from 'chalk';

export const ICON_SUCCESS = '✔';
export const ICON_FAILURE = '✖';
export const STRIP_ANSI_REGEX = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

export const ICON_SUCCESS_GREEN = chalk.green(ICON_SUCCESS);
export const ICON_FAILURE_RED = chalk.red(ICON_FAILURE);

export function prettyPath(p: string): string {
  const d = path.dirname(p);
  const h = os.homedir();

  if (process.cwd() === d) {
    return './' + path.basename(p);
  } else if (p.indexOf(h) === 0) {
    return '~/' + p.substring(h.length + 1);
  }

  return p;
}

export function indent(n: number = 4): string {
  return new Array(n).fill(' ').join('');
}

export function generateFillSpaceStringList(list: string[], optimalLength: number, fillCharacter: string = ' '): string[] {
  const longestItem = Math.max(
    ...list.map((item: string) => item.replace(STRIP_ANSI_REGEX, '').length)
  );

  const fullLength = longestItem > optimalLength ? longestItem + 1 : optimalLength;
  const fullLengthString = Array(fullLength).fill(fillCharacter).join('');

  return list.map(item => fullLengthString.substr(0, fullLength - item.length));
}
