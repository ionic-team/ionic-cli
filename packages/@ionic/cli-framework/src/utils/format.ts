import chalk from 'chalk';
import * as os from 'os';
import * as path from 'path';
import sliceAnsi = require('slice-ansi');
import stringWidth = require('string-width');
import stripAnsi = require('strip-ansi');
import untildify = require('untildify');
import wrapAnsi = require('wrap-ansi');

export { stringWidth, stripAnsi };

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

export interface WordWrapOptions {
  width?: number;
  indentation?: number;
  append?: string;
}

export function wordWrap(msg: string, { width = TTY_WIDTH, indentation = 0, append = '' }: WordWrapOptions) {
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

export interface ColumnarOptions {
  hsep?: string;
  vsep?: string;
  headers?: string[];
}

/**
 * Basic CLI table generator with support for ANSI colors.
 *
 * @param rows 2-dimensional matrix containing cells. An array of columns,
 *             which are arrays of cells.
 * @param options.vsep The vertical separator character, default is
 *                     `chalk.dim('|')`. Supply an empty string to hide
 *                     the separator altogether.
 * @param options.hsep The horizontal separator character, default is
 *                     `chalk.dim('-')`. This is used under the headers,
 *                     if supplied. Supply an empty string to hide the
 *                     separator altogether.
 * @param options.headers An array of header cells.
 */
export function columnar(rows: string[][], { hsep = chalk.dim('-'), vsep = chalk.dim('|'), headers }: ColumnarOptions): string {
  const includeHeaders = headers ? true : false;

  if (!rows[0]) {
    return '';
  }

  const columnCount = headers ? headers.length : rows[0].length;
  const columns = headers ?
    headers.map(header => [chalk.bold(header)]) :
    rows[0].map(() => []);

  for (const row of rows) {
    let highestLineCount = 0;
    const splitRows = row.map(cell => {
      const lines = cell.split('\n');
      highestLineCount = Math.max(highestLineCount, lines.length);
      return lines;
    });

    for (const rowIndex in row) {
      if (columns[rowIndex]) {
        columns[rowIndex].push(...splitRows[rowIndex], ...Array(highestLineCount - splitRows[rowIndex].length).fill(''));
      }
    }
  }

  const paddedColumns = columns.map((col, columnIndex) => {
    if (columnIndex < columnCount - 1) {
      const spaceCol = generateFillSpaceStringList(col);
      return col.map((cell, cellIndex) => `${cell}${spaceCol[cellIndex]}${vsep === '' ? '' : `${vsep} `}`);
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

  if (includeHeaders && hsep !== '') {
    singleColumn.splice(1, 0, hsep.repeat(longestRowLength));
  }

  return singleColumn.join('\n');
}
