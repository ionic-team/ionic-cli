import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata
} from '@ionic/cli';

/**
 * Metadata about the prepare command
 */
@CommandMetadata({
  name: 'prepare',
  description: 'prepare',
  isProjectTask: true
})
export class PrepareCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    this.env.log.msg('prepare');
  }
}
