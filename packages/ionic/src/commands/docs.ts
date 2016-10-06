import { ionicCommandOptions, CommandMetadata } from '../ionic';

export const metadata: CommandMetadata = {
  name: 'docs',
  description: 'Opens up the documentation for Ionic',
  inputs: [
    {
      name: 'topic',
      description: 'the topic to view help documentation for. Use "ls" to view all topics',
    }
  ],
  isProjectTask: false
};

export function run(env: ionicCommandOptions): Promise<void> | void {
  const logger = env.utils.log;

  logger.msg(env.argv);

  return Promise.resolve();
}
