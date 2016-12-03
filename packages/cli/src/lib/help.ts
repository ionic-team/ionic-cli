import * as chalk from 'chalk';

import { CommandData, CommandOption } from '../definitions';
import { STRIP_ANSI_REGEX } from './utils/format';


export function formatCommandHelp(cmdMetadata: CommandData): string {
  return `
  ${chalk.bold(cmdMetadata.description)}
  ${formatUsage(cmdMetadata)}${cmdMetadata.options ? formatOptions(cmdMetadata.options) : ''}${formatExamples(cmdMetadata)}
  `;
}

function formatUsage(cmdMetadata: CommandData): string {
  let headerLine = chalk.bold(`Usage`);
  let usageLine =
      `$ ${cmdMetadata.name} ${
        (cmdMetadata.inputs || []).map(command => '<' + command.name + '>').join(' ')}`;

  return `
    ${headerLine}
      ${usageLine}
  `;
}

function formatOptions(options: CommandOption[]): string {
  if (options.length === 0) {
    return '';
  }

  let headerLine = chalk.bold(`Options`);

  function optionLineFn(option: CommandOption) {
    let optionList = chalk.green(`--${option.name}`) +
      (option.aliases && option.aliases.length > 0 ? ', ' +
       option.aliases
         .map((alias) => chalk.green(`-${alias}`))
         .join(', ') : '');

    let optionListLength = optionList.replace(STRIP_ANSI_REGEX, '').length;

    return `${optionList} ${Array(20 - optionListLength).join('.')} ${option.description}`;
  };

  return `
    ${headerLine}
      ${options.map(optionLineFn).join(`
      `)}
  `;
}

function formatExamples(cmdMetadata: CommandData): string {
  let headerLine = chalk.bold(`Examples`);
  let exampleLine =
    `$ ${cmdMetadata.name} ${(cmdMetadata.inputs || []).map(command => command.name).join(' ')}`;

  return `
    ${headerLine}
      ${exampleLine}
  `;
}
