import {
  CommandLineInputs,
  CommandLineOptions,
  Command,
  CommandMetadata,
} from '@ionic/cli-utils';

@CommandMetadata({
  name: 'version',
  type: 'global',
  description: 'Returns the current CLI version',
  visible: false,
})
export class VersionCommand extends Command {
  public async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    this.env.log.msg(`${this.env.plugins.ionic.version}`);
  }
}
