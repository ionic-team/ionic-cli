import {
  CommandData,
  CommandLineInputs,
  CommandLineOptions,
  CommandOption,
  ICommand
} from '../definitions';

import { Command, CommandMetadata } from '../lib/command';

@CommandMetadata({
  name: 'help',
  description: 'Provides help for a certain command',
  inputs: [
    {
      name: 'command',
      description: 'The command you desire help with',
    }
  ],
  isProjectTask: false
})
export default class HelpCommand extends Command implements ICommand {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const command = this.env.commands.get(inputs[0]) || this.env.commands.get('help');

    if (command) {
      this.env.log.msg(formatCommandHelp(command.metadata));
    }
  }
}

function formatCommandHelp(cmdMetadata: CommandData): string {
  return `
  ${cmdMetadata.description}
  ${formatUsage(cmdMetadata)}${cmdMetadata.options ? formatOptions(cmdMetadata.options) : ''}${formatExamples(cmdMetadata)}
  `;
}

function formatUsage(cmdMetadata: CommandData): string {
  return `
    Usage
      $ ${cmdMetadata.name} ${
        (cmdMetadata.inputs || []).map(command => '<' + command.name + '>').join(' ')}
  `;
}

function formatOptions(options: CommandOption[]): string {
  return `
    Options ${options.map(option => {
        return '\n      --' + option.name +
          (option.aliases && option.aliases.length > 0 ? ', -' +
           option.aliases.join(', ') : '') +
          '  ' + option.description;
        })}
  `;
}

function formatExamples(cmdMetadata: CommandData): string {
  return `
    Examples
      $ ${cmdMetadata.name} ${
        (cmdMetadata.inputs || []).map(command => command.name)
          .join(' ')
        }
  `;
}
