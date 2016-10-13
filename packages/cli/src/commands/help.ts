import { IonicCommandOptions, CommandMetadata, Command, CommandData } from '../definitions';

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
export default class Help extends Command {
  run(env: IonicCommandOptions): void {
    const logger = env.utils.log;
    const commandName: string = env.argv._[0] || env.argv['command'];
    const command = env.allCommands.get(commandName) || env.allCommands.get('help')

    logger.msg(formatCommandHelp(command.metadata));
  }
}

function formatCommandHelp(cmdMetadata: CommandData): string {
  return `
  ${cmdMetadata.description}
  ${getUsage(cmdMetadata)}${cmdMetadata.availableOptions ? getOptions(cmdMetadata) : ''}${getExamples(cmdMetadata)}
  `;
}

function getUsage(cmdMetadata: CommandData): string {
  return `
    Usage
      $ ${cmdMetadata.name} ${
        (cmdMetadata.inputs || []).map(command => '<' + command.name + '>').join(' ')}
  `;
}

function getOptions(cmdMetadata: CommandData): string {
  return `
    Options ${(cmdMetadata.availableOptions || []).map(option => {
        return '\n      --' + option.name +
          ', -' + option.aliases.join(', ') +
          '  ' + option.description;
        })}
  `;
}
function getExamples(cmdMetadata: CommandData): string {
  return `
    Examples
      $ ${cmdMetadata.name} ${
        (cmdMetadata.inputs || []).map(command => command.name)
          .join(' ')
        }
  `;
}