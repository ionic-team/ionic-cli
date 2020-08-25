import sliceAnsi = require('slice-ansi');
import stringWidth = require('string-width');
import stripAnsi = require('strip-ansi');
import wrapAnsi = require('wrap-ansi');

export { sliceAnsi, stringWidth, stripAnsi };

const MIN_TTY_WIDTH = 80;
const MAX_TTY_WIDTH = 120;
export const TTY_WIDTH = process.stdout.columns ? Math.max(MIN_TTY_WIDTH, Math.min(process.stdout.columns, MAX_TTY_WIDTH)) : Infinity;

export function indent(n = 4): string {
  return ' '.repeat(n);
}

export interface WordWrapOptions {
  width?: number;
  indentation?: number;
  append?: string;
}

export function wordWrap(msg: string, { width = TTY_WIDTH, indentation = 0, append = '' }: WordWrapOptions) {
  return wrapAnsi(msg, width - indentation - append.length, { trim: true }).split('\n').join(`${append}\n${indent(indentation)}`);
}
