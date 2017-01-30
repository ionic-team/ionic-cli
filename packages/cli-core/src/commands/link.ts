import {
  CommandLineInputs,
  CommandLineOptions,
  Command,
  CommandMetadata
} from '@ionic/cli-utils';

/**
 * Metadata about the docs command
 */
@CommandMetadata({
  name: 'link',
  description: 'Links your app with Ionic Cloud.',
  exampleCommands: [''],
  inputs: [
    {
      name: 'app_id',
      description: 'The Ionic Cloud app id that you would like to link to.'
    }
  ]
})
export class LinkCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {

  }
}
