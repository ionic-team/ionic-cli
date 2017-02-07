import * as chalk from 'chalk';

import { CommandData, CommandInput, CommandOption } from '../../definitions';
import { validators } from '../validators';
import { STRIP_ANSI_REGEX } from './format';

/**
 *
 */
export function formatCommandHelp(cmdMetadata: CommandData, commandName: string): string {
  let description = cmdMetadata.description.split('\n').join('\n  ');

  return `
  ${chalk.bold(description)}
  ` +
  formatUsage(cmdMetadata.inputs, commandName) +
  formatInputs(cmdMetadata.inputs) +
  formatOptions(cmdMetadata.options) +
  formatExamples(cmdMetadata, commandName);
}

function formatUsage(inputs: CommandInput[] = [], commandName: string): string {
  const headerLine = chalk.bold(`Usage`);
  const usageLine =
      `$ ionic ${commandName} ${
        (inputs || [])
          .map(input => {
            if (input.validators && input.validators.includes(validators.required)) {
              return '<' + input.name + '>';
            }
            return '[' + input.name + ']';
          })
          .join(' ')}`;

  return `
    ${headerLine}
      ${usageLine}
  `;
}

function formatInputs(inputs: CommandInput[] = []): string {
  if (inputs.length === 0) {
    return '';
  }

  const headerLine = chalk.bold(`Inputs`);

  function inputLineFn({ name, description}: CommandOption) {
    const optionList = chalk.green(`${name}`);
    const optionListLength = optionList.replace(STRIP_ANSI_REGEX, '').length;
    const fullLength = optionListLength > 25 ? optionListLength + 1 : 25;

    return `${optionList} ${Array(fullLength - optionListLength).fill('.').join('')} ${description}`;
  };

  return `
    ${headerLine}
      ${inputs.map(inputLineFn).join(`
      `)}
  `;
}

function formatOptions(options: CommandOption[] = []): string {
  if (options.length === 0) {
    return '';
  }

  const headerLine = chalk.bold(`Options`);

  function optionLineFn({ name, aliases, description}: CommandOption) {
    const optionList = chalk.green(`--${name}`) +
      (aliases && aliases.length > 0 ? ', ' +
       aliases
         .map((alias) => chalk.green(`-${alias}`))
         .join(', ') : '');

    const optionListLength = optionList.replace(STRIP_ANSI_REGEX, '').length;
    const fullLength = optionListLength > 25 ? optionListLength + 1 : 25;

    return `${optionList} ${Array(fullLength - optionListLength).fill('.').join('')} ${description}`;
  };

  return `
    ${headerLine}
      ${options.map(optionLineFn).join(`
      `)}
  `;
}

function formatExamples({ exampleCommands }: CommandData, commandName: string): string {
  if (!Array.isArray(exampleCommands)) {
    return '';
  }

  const headerLine = chalk.bold(`Examples`);
  const exampleLines = exampleCommands.map(cmd => `$ ionic ${commandName} ${cmd} `);

  return `
    ${headerLine}
      ${exampleLines.join(`
      `)}
  `;
}
