import * as os from 'os';
import * as path from 'path';

import chalk from 'chalk';
import sliceAnsi = require('slice-ansi');
import stringWidthModule = require('string-width');
import stripAnsiModule = require('strip-ansi');
import untildify = require('untildify');
import wrapAnsi = require('wrap-ansi');

export const stringWidth = stringWidthModule;
export const stripAnsi = stripAnsiModule;

const MIN_TTY_WIDTH = 80;
const MAX_TTY_WIDTH = 120;
export const TTY_WIDTH = process.stdout.columns ? Math.max(MIN_TTY_WIDTH, Math.min(process.stdout.columns, MAX_TTY_WIDTH)) : Infinity;

export function prettyPath(p: string): string {
  p = expandPath(p);
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

export function expandPath(p: string): string {
  return path.resolve(untildify(p));
}

export function indent(n = 4): string {
  return ' '.repeat(n);
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
  const fullLengthString = fillCharacter.repeat(fullLength);

  return list.map(item => sliceAnsi(fullLengthString, 0, fullLength - stringWidth(item)));
}

export function columnar(rows: string[][], options: { hsep?: string, vsep?: string, headers?: string[] } = {}): string {
  if (!options.hsep) {
    options.hsep = chalk.dim('-');
  }

  if (!options.vsep) {
    options.vsep = chalk.dim('|');
  }

  const includeHeaders = options.headers ? true : false;

  if (!rows[0]) {
    return '';
  }

  const columnCount = options.headers ? options.headers.length : rows[0].length;
  const columns = options.headers ?
    options.headers.map(header => [chalk.bold(header)]) :
    rows[0].map(() => []);

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
