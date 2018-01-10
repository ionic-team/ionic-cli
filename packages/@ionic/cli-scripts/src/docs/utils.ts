import * as ansiStyle from 'ansi-styles';
import * as escapeStringRegexp from 'escape-string-regexp';

export function getWarning() {
  return `
{% comment %}
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
DO NOT MODIFY THIS FILE DIRECTLY -- IT IS GENERATED FROM THE CLI REPO
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
{% endcomment %}
`;
}

export function formatPageHeader(name: string, id: string) {
  return `---
layout: fluid/cli_docs_base
category: cli
id: ${id}
page_name: ${name}
title: ${name} - Ionic CLI Documentation
hide_header_search: true
dark_header: true
---

${getWarning()}

# ${name}
`;
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

function convertAnsiToMd(str: string, style: ansiStyle.EscapeCodePair, md: ansiStyle.EscapeCodePair) {
  str = str.replace(new RegExp(escapeStringRegexp(style.open) + '(.*?)' + escapeStringRegexp(style.close), 'g'), md.open + '$1' + md.close);
  return str;
}
