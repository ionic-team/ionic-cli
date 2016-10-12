import { IonicCommandOptions, CommandMetadata, Command } from '../definitions';

/**
 * Metadata about the docs command
 */
@CommandMetadata({
  name: 'docs',
  description: 'Opens up the documentation for Ionic',
  inputs: [
    {
      name: 'topic',
      description: 'the topic to view help documentation for. Use "ls" to view all topics',
    }
  ],
  isProjectTask: false
})
export default class Docs extends Command {
  run(env: IonicCommandOptions): Promise<void> | void {
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
}
