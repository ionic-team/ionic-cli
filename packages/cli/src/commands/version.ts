import {
  CommandLineInputs,
  CommandLineOptions,
  Command,
  CommandMetadata,
  getCliInfo
} from '@ionic/cli-utils';

@CommandMetadata({
  name: 'version',
  description: 'Returns the current CLI version',
  options: [],
  isProjectTask: false
})
export class VersionCommand extends Command {
  public async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const info = await getCliInfo();

    this.env.log.msg(`${info['cli']}`);
  }
}
