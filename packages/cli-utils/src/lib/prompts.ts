import * as chalk from 'chalk';
import * as inquirerType from 'inquirer';

import {
  ConfigFile,
  ConfirmPromptQuestion,
  IConfig,
  ILogger,
  NonConfirmPromptQuestion,
  PromptModule,
} from '../definitions';

import { load } from './modules';

export async function createPromptModule(log: ILogger, config: IConfig<ConfigFile>): Promise<PromptModule> {
  const inquirer = load('inquirer');
  const inquirerPromptModule = inquirer.createPromptModule();

  // TODO: typescript doesn't seem to know to check return types of the union implementation, be careful
  async function createPrompter(question: NonConfirmPromptQuestion): Promise<string>;
  async function createPrompter(question: ConfirmPromptQuestion): Promise<boolean>;
  async function createPrompter(question: ConfirmPromptQuestion | NonConfirmPromptQuestion): Promise<boolean | string> {
    const configData = await config.load();

    if (configData.cliFlags.interactive === false) {
      if (typeof question.noninteractiveValue !== 'undefined') {
        return question.noninteractiveValue;
      }

      if (question.type === 'confirm') {
        if (configData.cliFlags.confirm) {
          log.info(`${chalk.green('--confirm')}: ${chalk.dim(question.message)} ${chalk.cyan('Yes')}`);
          return true;
        } else {
          log.info(`${chalk.green('--no-confirm')}: ${chalk.dim(question.message)} ${chalk.cyan('No')}`);
          return false;
        }
      }

      return '';
    }

    const result = (await inquirerPromptModule(question))[question.name];

    if (typeof result !== 'string' || typeof result !== 'boolean') {
      return String(result);
    }

    return result;
  }

  return createPrompter;
}
