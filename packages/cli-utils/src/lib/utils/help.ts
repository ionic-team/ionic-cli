import * as chalk from 'chalk';

import { CommandData, CommandOption } from '../../definitions';
import { STRIP_ANSI_REGEX } from './format';

/**
 *
 */
export function formatCommandHelp(cmdMetadata: CommandData): string {
  return `
  ${chalk.bold(cmdMetadata.description)}
  ${formatUsage(cmdMetadata)}${cmdMetadata.options ? formatOptions(cmdMetadata.options) : ''}${formatExamples(cmdMetadata)}
  `;
}

function formatUsage({ name, inputs }: CommandData): string {
  const headerLine = chalk.bold(`Usage`);
  const usageLine =
      `$ ${name} ${
        (inputs || []).map(command => '<' + command.name + '>').join(' ')}`;

  return `
    ${headerLine}
      ${usageLine}
  `;
}

function formatOptions(options: CommandOption[]): string {
  if (!Array.isArray(options) || options.length === 0) {
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

    return `${optionList} ${Array(fullLength - optionListLength).join('.')} ${description}`;
  };

  return `
    ${headerLine}
      ${options.map(optionLineFn).join(`
      `)}
  `;
}

function formatExamples({ name, inputs }: CommandData): string {
  let headerLine = chalk.bold(`Examples`);
  let exampleLine =
    `$ ${name} ${(inputs || []).map(command => command.name).join(' ')}`;

  return `
    ${headerLine}
      ${exampleLine}
  `;
}
