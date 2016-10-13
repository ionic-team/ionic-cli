import { CommandEnvironment, ICommand } from '../definitions';
import { Command, CommandMetadata } from '../lib/command';

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
export default class DocsCommand extends Command implements ICommand {
  async run(env: CommandEnvironment): Promise<void> {
    const logger = env.utils.log;
    const topic = env.inputs[0];

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
