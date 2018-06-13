import * as ansiStyle from 'ansi-styles';
import * as escapeStringRegexp from 'escape-string-regexp';

interface CodePair {
  open: string;
  close: string;
}

export function links2md(str: string) {
  str = str.replace(/((http|https):\/\/(\w+:{0,1}\w*@)?([^\s\*\)`]+)(\/|\/([\w#!:.?+=&%@!\-\/]))?)/g, '[$1]($1)');
  str = str.replace(/\[(\d+)\]/g, '\\\[$1\\\]');
  return str;
}

export function ansi2md(str: string) {
  str = str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  str = convertAnsiToMd(str, ansiStyle.green, { open: '`', close: '`' });
  str = convertAnsiToMd(str, ansiStyle.yellow, { open: '', close: '' });
  str = convertAnsiToMd(str, ansiStyle.bold, { open: '**', close: '**' });
  return str;
}

function convertAnsiToMd(str: string, style: CodePair, md: CodePair) {
  str = str.replace(new RegExp(escapeStringRegexp(style.open) + '(.*?)' + escapeStringRegexp(style.close), 'g'), md.open + '$1' + md.close);
  return str;
}
