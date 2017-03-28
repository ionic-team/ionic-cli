import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
} from '@ionic/cli-utils';

@CommandMetadata({
  name: 'list',
  description: 'List your cloud builds',
  exampleCommands: [''],
})
export class PackageListCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
  }
}
