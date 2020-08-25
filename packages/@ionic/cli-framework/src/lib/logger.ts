import { LoggerFormatter, getLoggerLevelColor, getLoggerLevelName } from '@ionic/cli-framework-output';
import * as chalk from 'chalk';
import * as lodash from 'lodash';

import { WordWrapOptions, stringWidth, wordWrap } from '../utils/format';

import { Colors, DEFAULT_COLORS } from './colors';

export interface CreateTaggedFormatterOptions {
  prefix?: string | (() => string);
  titleize?: boolean;
  wrap?: boolean | WordWrapOptions;
  colors?: Colors;
}

export function createTaggedFormatter({ colors = DEFAULT_COLORS, prefix = '', titleize, wrap }: CreateTaggedFormatterOptions = {}): LoggerFormatter {
  return ({ msg, level, format }) => {
    if (format === false) {
      return msg;
    }

    const { strong, weak } = colors;

    const [ firstLine, ...lines ] = msg.split('\n');

    const levelName = getLoggerLevelName(level);
    const levelColor = getLoggerLevelColor(colors, level);

    const tag = (
      (typeof prefix === 'function' ? prefix() : prefix) +
      (levelName ? `${weak('[')}${chalk.bgBlack(strong(levelColor ? levelColor(levelName) : levelName))}${weak(']')}` : '')
    );

    const title = titleize && lines.length > 0 ? `${strong(levelColor ? levelColor(firstLine) : firstLine)}\n` : firstLine;
    const indentation = tag ? stringWidth(tag) + 1 : 0;
    const pulledLines = lodash.dropWhile(lines, l => l === '');

    return (
      (tag ? `${tag} ` : '') +
      (wrap
        ? wordWrap([title, ...pulledLines].join('\n'), { indentation, ...(typeof wrap === 'object' ? wrap : {}) })
        : [title, ...pulledLines.map(l => l ? ' '.repeat(indentation) + l : '')].join('\n')
      )
    );
  };
}

export function createPrefixedFormatter(prefix: string | (() => string)): LoggerFormatter {
  return ({ msg, format }) => {
    if (format === false) {
      return msg;
    }

    return `${typeof prefix === 'function' ? prefix() : prefix} ${msg}`;
  };
}
