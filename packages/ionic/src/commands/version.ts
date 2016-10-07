import { ionicCommandOptions, CommandMetadata } from '../ionic';
import { getCliInfo } from '../utils/environmentInfo';

export const metadata: CommandMetadata = {
  name: 'version',
  description: 'Returns the current CLI version',
  availableOptions: [],
  isProjectTask: false
};

export async function run(env: ionicCommandOptions): Promise<void> | void {
  const logger = env.utils.log;

  const info = await getCliInfo();

  logger.msg(`${info['version']}\n`);
}
