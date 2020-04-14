import { Colors } from '@ionic/cli-framework';
import { COLORS } from '@ionic/cli/lib/color';
import * as chalk from 'chalk';
import * as escapeStringRegexp from 'escape-string-regexp';

interface CodePair {
  open: string;
  close: string;
}

interface Color {
  _styler: CodePair;
}

type ColorRegistry = { [K in keyof Colors]: Color };

export function links2md(str: string): string {
  str = str.replace(/((http|https):\/\/(\w+:{0,1}\w*@)?([^\s\*\)`]+)(\/|\/([\w#!:.?+=&%@!\-\/]))?)/g, '[$1]($1)');
  str = str.replace(/\[(\d+)\]/g, '\\\[$1\\\]');
  return str;
}

export function ansi2md(str: string): string {
  const yellow = chalk.yellow as any as Color;
  const { input, strong } = COLORS as any as ColorRegistry;
  str = convertAnsiToMd(str, [input._styler], { open: '`', close: '`' });
  str = convertAnsiToMd(str, [yellow._styler], { open: '', close: '' });
  str = convertAnsiToMd(str, [strong._styler], { open: '**', close: '**' });
  return str;
}

export function convertHTMLEntities(str: string): string {
  return str.replace(/(?<=^(?:[^\`]|\`[^\`]*\`)*)\<(\S+)\>/g, '&lt;$1&gt;');
}

function convertAnsiToMd(str: string, styles: readonly CodePair[], md: CodePair): string {
  const start = styles.map(style => style.open).join('');
  const end = [...styles].reverse().map(style => style.close).join('');
  const re = new RegExp(escapeStringRegexp(start) + '(.*?)' + escapeStringRegexp(end) , 'g');

  return str.replace(re, md.open + '$1' + md.close);
}
