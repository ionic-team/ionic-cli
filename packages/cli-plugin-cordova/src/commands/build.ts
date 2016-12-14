import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata
} from '@ionic/cli-utils';

/**
 * Metadata about the build command
 */
@CommandMetadata({
  name: 'build',
  description: 'Build (prepare + compile) an Ionic project for a given platform.',
  inputs: [
    {
      name: 'platform',
      description: 'the platform that you would like to build',
    }
  ],
  options: [
    {
      name: 'nohooks',
      description: 'Do not add default Ionic hooks for Cordova',
      type: Boolean
    }
  ],
  isProjectTask: true
})
export class BuildCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    this.env.log.msg('build');
  }
}
