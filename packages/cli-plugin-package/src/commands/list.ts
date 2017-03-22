import {
  CommandLineInputs,
  CommandLineOptions,
  Command,
  CommandMetadata,
  runCommand,
} from '@ionic/cli-utils';

/**
 * Metadata about the package:list command
 */
@CommandMetadata({
  name: 'list',
  description: 'Lists recent package builds',
})
export class ListCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    runCommand(this.env, ['upload']);
  }
}
