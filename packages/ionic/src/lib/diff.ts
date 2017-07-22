import * as chalk from 'chalk';

import * as JsDiff from 'diff';

export function diffPatch(filename: string, text1: string, text2: string): string {
  return JsDiff.createPatch(filename, text1, text2, '', '').split('\n').map((line) => {
    if (line.indexOf('-') === 0 && line.indexOf('---') !== 0) {
      line = chalk.bold(chalk.red(line));
    } else if (line.indexOf('+') === 0 && line.indexOf('+++') !== 0) {
      line = chalk.bold(chalk.green(line));
    }

    return line;
  }).slice(2).join('\n');
}
