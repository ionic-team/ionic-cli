import { CreateTaggedFormatterOptions, DEFAULT_LOGGER_HANDLERS, LOGGER_LEVELS, Logger as BaseLogger, LoggerFormatter, LoggerLevelWeight, createPrefixedFormatter, createTaggedFormatter } from '@ionic/cli-framework';
import chalk from 'chalk';

import { ILogger } from '../../definitions';
import { weak } from '../color';

export class Logger extends BaseLogger implements ILogger {
  ok(msg: string): void {
    this.log({ ...this.createRecord(`${weak('[')}${chalk.bold.green('OK')}${weak(']')} ${msg}`), format: false });
  }

  rawmsg(msg: string): void {
    this.log({ ...this.createRecord(msg), format: false });
  }
}

export function createFormatter(options: CreateTaggedFormatterOptions = {}): LoggerFormatter {
  const prefix = process.argv.includes('--log-timestamps') ? () => `${weak('[' + new Date().toISOString() + ']')}` : '';

  return createTaggedFormatter({ prefix, titleize: true, wrap: true, ...options });
}

export function createDefaultLoggerHandlers(formatter = createFormatter()) {
  return new Set([...DEFAULT_LOGGER_HANDLERS].map(handler => handler.clone({ formatter })));
}

export function createPrefixedWriteStream(log: ILogger, prefix: string, level: LoggerLevelWeight = LOGGER_LEVELS.INFO): NodeJS.WritableStream {
  const l = log.clone();
  l.handlers = createDefaultLoggerHandlers(createPrefixedFormatter(prefix));

  return l.createWriteStream(level);
}
