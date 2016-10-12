import { IonicCommandOptions, CommandMetadata, Command } from '../definitions';
import { getCliInfo } from '../utils/environmentInfo';

@CommandMetadata({
  name: 'version',
  description: 'Returns the current CLI version',
  availableOptions: [],
  isProjectTask: false
})
export default class Version extends Command {
  async run(env: IonicCommandOptions): Promise<void> {
    const logger = env.utils.log;

    const info = await getCliInfo();

    logger.msg(`${info['version']}\n`);
  }
}
