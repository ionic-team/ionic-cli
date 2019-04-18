import { Colors } from '@ionic/cli-framework';
import chalk from 'chalk';
import * as escapeStringRegexp from 'escape-string-regexp';
import { COLORS } from 'ionic/lib/color';

interface CodePair {
  open: string;
  close: string;
}

interface Color {
  _styles: ReadonlyArray<CodePair>;
}

type ColorRegistry = { [K in keyof Colors]: Color };

export function links2md(str: string) {
  str = str.replace(/((http|https):\/\/(\w+:{0,1}\w*@)?([^\s\*\)`]+)(\/|\/([\w#!:.?+=&%@!\-\/]))?)/g, '[$1]($1)');
  str = str.replace(/\[(\d+)\]/g, '\\\[$1\\\]');
  return str;
}

export function ansi2md(str: string) {
  const yellow = chalk.yellow as any as Color;
  const { input, strong } = COLORS as any as ColorRegistry;
  str = convertAnsiToMd(str, input._styles, { open: '`', close: '`' });
  str = convertAnsiToMd(str, yellow._styles, { open: '', close: '' });
  str = convertAnsiToMd(str, strong._styles, { open: '**', close: '**' });
  return str;
}

function convertAnsiToMd(str: string, styles: ReadonlyArray<CodePair>, md: CodePair) {
  const start = styles.map(style => style.open).join('');
  const end = [...styles].reverse().map(style => style.close).join('');
  const re = new RegExp(escapeStringRegexp(start) + '(.*?)' + escapeStringRegexp(end) , 'g');

  return str.replace(re, md.open + '$1' + md.close);
}
