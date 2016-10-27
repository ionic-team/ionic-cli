import { CommandData, CommandOption } from '../definitions';

export function formatCommandHelp(cmdMetadata: CommandData): string {
  return `
  ${cmdMetadata.description}
  ${formatUsage(cmdMetadata)}${cmdMetadata.options ? formatOptions(cmdMetadata.options) : ''}${formatExamples(cmdMetadata)}
  `;
}

export function formatUsage(cmdMetadata: CommandData): string {
  return `
    Usage
      $ ${cmdMetadata.name} ${
        (cmdMetadata.inputs || []).map(command => '<' + command.name + '>').join(' ')}
  `;
}

export function formatOptions(options: CommandOption[]): string {
  return `
    Options ${options.map(option => {
        return '\n      --' + option.name +
          (option.aliases && option.aliases.length > 0 ? ', -' +
           option.aliases.join(', ') : '') +
          '  ' + option.description;
        })}
  `;
}

export function formatExamples(cmdMetadata: CommandData): string {
  return `
    Examples
      $ ${cmdMetadata.name} ${
        (cmdMetadata.inputs || []).map(command => command.name)
          .join(' ')
        }
  `;
}
