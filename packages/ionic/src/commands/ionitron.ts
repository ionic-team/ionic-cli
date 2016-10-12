import { IonicCommandOptions, CommandMetadata, Command } from '../definitions';

@CommandMetadata({
  name: 'ionitron',
  description: 'Print random ionitron messages',
  availableOptions: [],
  isProjectTask: false
})
export default class Ionitron extends Command {
  run(env: IonicCommandOptions): void {
    const logger = env.utils.log;

    logger.msg(env.argv);
  }
}
