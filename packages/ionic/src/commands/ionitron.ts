import { ionicCommandOptions, CommandMetadata } from '../ionic';

export const metadata: CommandMetadata = {
  name: 'ionitron',
  description: 'Print random ionitron messages',
  availableOptions: [],
  isProjectTask: false
};

export function run(env: ionicCommandOptions): Promise<void> | void {
  const logger = env.utils.log;

  logger.msg(env.argv);
}
