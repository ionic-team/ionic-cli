import * as chalk from 'chalk';

import { CommandData, CommandInput, CommandOption } from '../../definitions';
import { validators } from '../validators';
import { STRIP_ANSI_REGEX, generateFillSpaceStringList } from './format';

/**
 *
 */
export function formatCommandHelp(cmdMetadata: CommandData): string {
  let description = cmdMetadata.description.split('\n').join('\n  ');
  let fullName = cmdMetadata.fullName || cmdMetadata.name;

  return `
  ${chalk.bold(description)}
  ` +
  formatCommandUsage(cmdMetadata.inputs, fullName) +
  formatCommandInputs(cmdMetadata.inputs) +
  formatCommandOptions(cmdMetadata.options) +
  formatCommandExamples(cmdMetadata.exampleCommands, fullName);
}

export function getListOfCommandDetails(cmdMetadataList: CommandData[]): string[] {
  const fillStringArray = generateFillSpaceStringList(cmdMetadataList.map(cmdMd => cmdMd.fullName || cmdMd.name), 25, '.');

  return cmdMetadataList.map((cmdMd, index) =>
    `${chalk.green(cmdMd.fullName || '')} ${fillStringArray[index]} ${cmdMd.description}`
  );
}

function formatCommandUsage(inputs: CommandInput[] = [], commandName: string): string {
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

function formatCommandInputs(inputs: CommandInput[] = []): string {
  if (inputs.length === 0) {
    return '';
  }

  const headerLine = chalk.bold(`Inputs`);

  const fillStrings = generateFillSpaceStringList(inputs.map(input => input.name), 25, '.');

  function inputLineFn({ name, description}: CommandOption, index: number) {
    const optionList = chalk.green(`${name}`);

    return `${optionList} ${fillStrings[index]} ${description}`;
  };

  return `
    ${headerLine}
      ${inputs.map(inputLineFn).join(`
      `)}
  `;
}

function formatCommandOptions(options: CommandOption[] = []): string {
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

function formatCommandExamples(exampleCommands: string[] | undefined, commandName: string): string {
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
