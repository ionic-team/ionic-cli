import * as os from 'os';
import * as path from 'path';

import * as chalk from 'chalk';
import * as stringWidth from 'string-width';

import { load } from '../modules';

export const ICON_ELLIPSIS = '…';
export const ICON_SUCCESS = '✔';
export const ICON_FAILURE = '✖';

export const SPINNER_FRAMES = process.platform === 'win32' ?
  ['-', '\\', '|', '/'] :
  ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export function prettyPath(p: string): string {
  p = path.resolve(p);
  const cwd = process.cwd();
  const d = path.dirname(p);
  const h = os.homedir();
  const distanceFromCwd = Math.abs(d.split(path.sep).length - cwd.split(path.sep).length);

  if (cwd === d) {
    return '.' + path.sep + path.basename(p);
  } else if (d.startsWith(cwd)) {
    return '.' + path.sep + p.substring(cwd.length + 1);
  } else if (distanceFromCwd <= 2) {
    const rel = path.relative(cwd, p);
    return rel ? rel : '.';
  } else if (p === h) {
    return '~';
  } else if (p.indexOf(h) === 0) {
    return '~' + path.sep + p.substring(h.length + 1);
  }

  return p;
}

export function indent(n: number = 4): string {
  return new Array(n).fill(' ').join('');
}

export function generateFillSpaceStringList(list: string[], optimalLength: number = 1, fillCharacter: string = ' '): string[] {
  const sliceAnsi = load('slice-ansi');

  const longestItem = Math.max(
    ...list.map((item) => stringWidth(item))
  );

  const fullLength = longestItem > optimalLength ? longestItem + 1 : optimalLength;
  const fullLengthString = Array(fullLength).fill(fillCharacter).join('');

  return list.map(item => sliceAnsi(fullLengthString, 0, fullLength - stringWidth(item)));
}

export function columnar(rows: string[][], { hsep = chalk.dim('-'), vsep = chalk.dim('|'), columnHeaders }: { hsep?: string, vsep?: string, columnHeaders?: string[] } = {}) {
  const includeHeaders = columnHeaders ? true : false;

  if (!rows[0]) {
    return '';
  }

  const columnCount = columnHeaders ? columnHeaders.length : rows[0].length;
  const columns = columnHeaders ?
    columnHeaders.map(header => [chalk.bold(header)]) :
    new Array<string[]>(columnCount).fill(<string[]>[]).map(() => []);

  for (let row of rows) {
    for (let i in row) {
      if (columns[i]) {
        columns[i].push(row[i]);
      }
    }
  }

  const paddedColumns = columns.map((col, i) => {
    if (i < columnCount - 1) {
      const spaceCol = generateFillSpaceStringList(col);
      return col.map((cell, i) => `${cell}${spaceCol[i]}${vsep} `);
    } else {
      return col;
    }
  });

  let longestRowLength = 0;
  const singleColumn = paddedColumns.reduce((a, b) => {
    return a.map((_, i) => {
      const r = a[i] + b[i];
      longestRowLength = Math.max(longestRowLength, stringWidth(r));
      return r;
    });
  });

  if (includeHeaders) {
    singleColumn.splice(1, 0, hsep.repeat(longestRowLength));
  }

  return singleColumn.join('\n');
}
