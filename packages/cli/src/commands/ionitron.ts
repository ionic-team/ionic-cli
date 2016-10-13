import Command from './command';
import { IonicCommandOptions, CommandMetadata, ICommand } from '../definitions';

@CommandMetadata({
  name: 'ionitron',
  description: 'Print random ionitron messages',
  availableOptions: [],
  isProjectTask: false
})
export default class IonitronCommand extends Command implements ICommand {
  async run(env: IonicCommandOptions): Promise<void> {
    const logger = env.utils.log;

    logger.msg(env.argv);
  }
}
