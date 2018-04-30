import chalk from 'chalk';
import * as inquirerType from 'inquirer';

import { CreateTaggedFormatterOptions, Logger as BaseLogger, LoggerFormatter, StreamHandler, createTaggedFormatter, stderrLogRecordFilter, stdoutLogRecordFilter } from '@ionic/cli-framework';

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

export function createInteractiveHandlers(bottomBar: inquirerType.ui.BottomBar): Set<StreamHandler> {
  const formatter = createFormatter();

  return new Set([
    new StreamHandler({ stream: bottomBar.log, formatter }),
  ]);
}

export function createHandlers(): Set<StreamHandler> {
  const formatter = createFormatter();

  return new Set([
    new StreamHandler({ stream: process.stdout, filter: stdoutLogRecordFilter, formatter }),
    new StreamHandler({ stream: process.stderr, filter: stderrLogRecordFilter, formatter }),
  ]);
}
