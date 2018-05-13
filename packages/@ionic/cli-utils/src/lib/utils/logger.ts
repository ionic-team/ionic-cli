import chalk from 'chalk';

import { CreateTaggedFormatterOptions, Logger as BaseLogger, LoggerFormatter, createTaggedFormatter } from '@ionic/cli-framework';

import { ILogger } from '../../definitions';

export class Logger extends BaseLogger implements ILogger {
  ok(msg: string): void {
    this.log({ format: false, ...this.createRecord(`${chalk.dim('[')}${chalk.bold.green('OK')}${chalk.dim(']')} ${msg}`) });
  }

  rawmsg(msg: string): void {
    this.log({ format: false, ...this.createRecord(msg) });
  }
}

export function createFormatter(options: CreateTaggedFormatterOptions = {}): LoggerFormatter {
  const prefix = process.argv.includes('--log-timestamps') ? () => `${chalk.dim('[' + new Date().toISOString() + ']')}` : '';

  return createTaggedFormatter({ prefix, titleize: true, wrap: true, ...options });
}
