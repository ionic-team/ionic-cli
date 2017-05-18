import * as chalk from 'chalk';
import * as inquirerType from 'inquirer';

import { IConfig, ILogger, ConfigFile, PromptModule, PromptQuestion } from '../definitions';
import { load } from './modules';

export async function createPromptModule(log: ILogger, config: IConfig<ConfigFile>): Promise<PromptModule> {
  const inquirer = load('inquirer');
  const inquirerPromptModule = inquirer.createPromptModule();

  return async (question: PromptQuestion): Promise<string> => {
    const configData = await config.load();

    if (configData.cliFlags.interactive === false) {
      if (typeof question.noninteractiveValue !== 'undefined') {
        return question.noninteractiveValue;
      }

      if (question.type === 'confirm') {
        if (configData.cliFlags.confirm) {
          log.info(`${chalk.green('--confirm')}: ${chalk.dim(question.message)} ${chalk.cyan('Yes')}`);
          return 'confirm';
        } else {
          log.info(`${chalk.green('--no-confirm')}: ${chalk.dim(question.message)} ${chalk.cyan('No')}`);
          return '';
        }
      }

      return '';
    }

    const result = (await inquirerPromptModule(question))[question.name];

    if (result === true) {
      return 'confirm';
    } else if (result === false || result === undefined) {
      return '';
    }

    return result;
  };
}
