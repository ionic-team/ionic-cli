import { CommandEnvironment, ICommand } from '../definitions';
import { Command, CommandMetadata } from '../lib/command';
import { getCliInfo } from '../lib/utils/environmentInfo';

@CommandMetadata({
  name: 'version',
  description: 'Returns the current CLI version',
  options: [],
  isProjectTask: false
})
export default class VersionCommand extends Command implements ICommand {
  public async run(env: CommandEnvironment): Promise<void> {
    const info = await getCliInfo();

    env.log.msg(`${info['version']}\n`);
  }
}
