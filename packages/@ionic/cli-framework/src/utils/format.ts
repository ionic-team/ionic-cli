import * as os from 'os';
import * as path from 'path';

import chalk from 'chalk';
import * as sliceAnsiModule from 'slice-ansi';
import * as stringWidthModule from 'string-width';
import * as wrapAnsiModule from 'wrap-ansi';

import stripAnsiModule = require('strip-ansi');

export const stripAnsi = stripAnsiModule;
export const sliceAnsi = sliceAnsiModule;
export const stringWidth = stringWidthModule;
export const wrapAnsi = wrapAnsiModule;

const MIN_TTY_WIDTH = 80;
const MAX_TTY_WIDTH = 120;
export const TTY_WIDTH = process.stdout.columns ? Math.max(MIN_TTY_WIDTH, Math.min(process.stdout.columns, MAX_TTY_WIDTH)) : Infinity;

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

export function indent(n = 4): string {
  return new Array(n).fill(' ').join('');
}

export function wordWrap(msg: string, { width = TTY_WIDTH, indentation = 0, append = '' }: { width?: number; indentation?: number; append?: string; }) {
  return wrapAnsi(msg, width - indentation - append.length, { trim: false }).split('\n').join(`${append}\n${indent(indentation)}`);
}

export function generateFillSpaceStringList(list: string[], optimalLength = 1, fillCharacter = ' '): string[] {
  if (optimalLength < 2) {
    optimalLength = 2;
  }

  const longestItem = Math.max(...list.map(item => stringWidth(item)));
  const fullLength = longestItem > optimalLength ? longestItem + 1 : optimalLength;
  const fullLengthString = Array(fullLength).fill(fillCharacter).join('');

  return list.map(item => sliceAnsi(fullLengthString, 0, fullLength - stringWidth(item)));
}

export function columnar(rows: string[][], options: { hsep?: string, vsep?: string, columnHeaders?: string[] } = {}): string {
  if (!options.hsep) {
    options.hsep = chalk.dim('-');
  }

  if (!options.vsep) {
    options.vsep = chalk.dim('|');
  }

  const includeHeaders = options.columnHeaders ? true : false;

  if (!rows[0]) {
    return '';
  }

  const columnCount = options.columnHeaders ? options.columnHeaders.length : rows[0].length;
  const columns = options.columnHeaders ?
    options.columnHeaders.map(header => [chalk.bold(header)]) :
    new Array(columnCount).fill([]).map(() => []);

  for (const row of rows) {
    for (const i in row) {
      if (columns[i]) {
        columns[i].push(row[i]);
      }
    }
  }

  const paddedColumns = columns.map((col, i) => {
    if (i < columnCount - 1) {
      const spaceCol = generateFillSpaceStringList(col);
      return col.map((cell, i) => `${cell}${spaceCol[i]}${options.vsep} `);
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
    singleColumn.splice(1, 0, options.hsep.repeat(longestRowLength));
  }

  return singleColumn.join('\n');
}
