import chalk from 'chalk';

import { PromptQuestion, PromptValue } from '@ionic/cli-framework';

import { ILogger, IonicEnvironmentFlags } from '../definitions';

export interface CreateOnFallbackOptions {
  readonly flags: IonicEnvironmentFlags;
  readonly log: ILogger;
}

export function createOnFallback({ flags: { confirm }, log }: CreateOnFallbackOptions) {
  return (question: PromptQuestion): PromptValue | void => {
    if (question.type === 'confirm') {
      if (confirm) {
        log.msg(`${chalk.green('--confirm')}: ${chalk.dim(question.message)} ${chalk.cyan('Yes')}`);
        return true;
      } else {
        log.msg(`${chalk.green('--no-confirm')}: ${chalk.dim(question.message)} ${chalk.cyan('No')}`);
        return false;
      }
    }
  };
}
