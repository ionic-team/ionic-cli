import chalk from 'chalk';

import {
  CheckboxPromptQuestion,
  ConfirmPromptQuestion,
  IConfig,
  ILogger,
  NonConfirmPromptQuestion,
  PromptModule,
} from '../definitions';

export async function createPromptModule({ interactive, confirm, log, config }: { interactive: boolean, confirm: boolean, log: ILogger, config: IConfig }): Promise<PromptModule> {
  const inquirer = await import('inquirer');
  const inquirerPromptModule = inquirer.createPromptModule();

  // TODO: typescript doesn't seem to know to check return types of the union implementation, be careful
  async function createPrompter(question: CheckboxPromptQuestion): Promise<string[]>;
  async function createPrompter(question: NonConfirmPromptQuestion): Promise<string>;
  async function createPrompter(question: ConfirmPromptQuestion): Promise<boolean>;
  async function createPrompter(question: ConfirmPromptQuestion | NonConfirmPromptQuestion | CheckboxPromptQuestion): Promise<boolean | string | string[]> {
    if (interactive === false) {
      if (typeof question.noninteractiveValue !== 'undefined') {
        return question.noninteractiveValue;
      }

      if (question.type === 'confirm') {
        if (confirm) {
          log.msg(`${chalk.green('--confirm')}: ${chalk.dim(question.message)} ${chalk.cyan('Yes')}`);
          return true;
        } else {
          log.msg(`${chalk.green('--no-confirm')}: ${chalk.dim(question.message)} ${chalk.cyan('No')}`);
          return false;
        }
      }

      return '';
    }

    const prompt = inquirerPromptModule(question);
    const result = (await prompt)[question.name];

    if (typeof result !== 'string' && typeof result !== 'boolean' && !Array.isArray(result)) {
      return String(result);
    }

    return result;
  }

  return createPrompter;
}
