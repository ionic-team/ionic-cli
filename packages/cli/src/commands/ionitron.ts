import { CommandEnvironment, ICommand } from '../definitions';
import { Command, CommandMetadata } from '../lib/command';

@CommandMetadata({
  name: 'ionitron',
  description: 'Print random ionitron messages',
  options: [],
  isProjectTask: false
})
export default class IonitronCommand extends Command implements ICommand {
  async run(env: CommandEnvironment): Promise<void> {
    const logger = env.utils.log;

    logger.msg(env.inputs, env.options);
  }
}
