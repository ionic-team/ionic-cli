import { IonicCommandOptions, CommandMetadata, ICommand } from '../definitions';
import Command from '../lib/command';
import { getCliInfo } from '../lib/utils/environmentInfo';

@CommandMetadata({
  name: 'version',
  description: 'Returns the current CLI version',
  availableOptions: [],
  isProjectTask: false
})
export default class VersionCommand extends Command implements ICommand {
  public async run(env: IonicCommandOptions): Promise<void> {
    const logger = env.utils.log;

    const info = await getCliInfo();

    logger.msg(`${info['version']}\n`);
  }
}
