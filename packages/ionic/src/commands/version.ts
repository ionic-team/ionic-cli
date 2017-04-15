import {
  CommandLineInputs,
  CommandLineOptions,
  Command,
  CommandMetadata,
} from '@ionic/cli-utils';

@CommandMetadata({
  name: 'version',
  unlisted: true,
  description: 'Returns the current CLI version',
})
export class VersionCommand extends Command {
  public async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    this.env.log.msg(`${this.env.versions.cli}`);
  }
}
