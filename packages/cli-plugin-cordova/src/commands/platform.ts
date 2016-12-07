import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata
} from '@ionic/cli';

/**
 * Metadata about the platform command
 */
@CommandMetadata({
  name: 'platform',
  description: 'Add platform target for building an Ionic app',
  inputs: [
    {
      name: 'platform',
      description: 'the platform that you would like to build',
    }
  ],
  options: [
    {
      name: 'noresources',
      description: 'Do not add default Ionic icons and splash screen resources',
      type: Boolean,
      aliases: ['r']
    },
    {
      name: 'nosave',
      description: 'Do not save the platform to the package.json file',
      type: Boolean,
      aliases: ['e']
    }
  ],
  isProjectTask: true
})
export class PlatformCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    this.env.log.msg('platform');
  }
}
