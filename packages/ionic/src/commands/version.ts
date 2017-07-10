import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
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
    // can't use logger--see https://github.com/ionic-team/ionic-cli/issues/2507
    process.stdout.write(this.env.plugins.ionic.version + '\n');
  }
}
