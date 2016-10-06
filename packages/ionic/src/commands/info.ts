import { ionicCommandOptions, CommandMetadata } from '../ionic';

export const metadata: CommandMetadata = {
  name: 'info',
  description: 'List information about the users runtime environment',
  isProjectTask: false
};

export function run(env: ionicCommandOptions): Promise<void> | void {
  const logger = env.utils.log;

  logger.msg(env.argv);

  return Promise.resolve();
}
