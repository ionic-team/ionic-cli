import { ionicCommandOptions, CommandMetadata } from '../ionic';

export const metadata: CommandMetadata = {
  name: 'help',
  description: 'Provides help for a certain command',
  inputs: [
    {
      name: 'command',
      description: 'The command you desire help with',
    }
  ],
  isProjectTask: false
};

export function run(env: ionicCommandOptions): Promise<void> | void {
  const logger = env.utils.log;
  const commandName: string = env.argv._[0] || env.argv['command'] || 'help';

  logger.msg(formatCommandHelp(env.allCommands.get(commandName).metadata));
}

function formatCommandHelp(cmdMetadata: CommandMetadata): string {
  return `
  ${cmdMetadata.description}
  ${getUsage(cmdMetadata)}${cmdMetadata.availableOptions ? getOptions(cmdMetadata) : ''}${getExamples(cmdMetadata)}
  `;
}

function getUsage(cmdMetadata: CommandMetadata): string {
  return `
    Usage
      $ ${cmdMetadata.name} ${
        (cmdMetadata.inputs || []).map(command => '<' + command.name + '>').join(' ')}
  `;
}

function getOptions(cmdMetadata: CommandMetadata): string {
  return `
    Options ${(cmdMetadata.availableOptions || []).map(option => {
        return '\n      --' + option.name +
          ', -' + option.aliases.join(', ') +
          '  ' + option.description;
        })}
  `;
}
function getExamples(cmdMetadata: CommandMetadata): string {
  return `
    Examples
      $ ${cmdMetadata.name} ${
        (cmdMetadata.inputs || []).map(command => command.name)
          .join(' ')
        }
  `;
}