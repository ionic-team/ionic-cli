import { ionicCommandOptions, CommandMetadata } from '../ionic';

/**
 * Metadata about the docs command
 */
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

/**
 * Primary function that executes the docs command.
 */
export function run(env: ionicCommandOptions): Promise<void> | void {
  const logger = env.utils.log;
  const inputs = env.argv._;
  const topic = inputs[0];

  /*
  if (!topic) {
    return;
  }
  if (topic) === 'ls') {
    return list;
  }
  
  return lookupTopic(topic);
  */
}
