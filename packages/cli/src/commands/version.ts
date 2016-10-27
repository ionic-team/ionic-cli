import { CommandLineInputs, CommandLineOptions } from '../definitions';
import { Command, CommandMetadata } from '../lib/command';
import { getCliInfo } from '../lib/utils/environmentInfo';

@CommandMetadata({
  name: 'version',
  description: 'Returns the current CLI version',
  options: [],
  isProjectTask: false
})
export class VersionCommand extends Command {
  public async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const info = await getCliInfo();

    this.env.log.msg(`${info['version']}\n`);
  }
}
