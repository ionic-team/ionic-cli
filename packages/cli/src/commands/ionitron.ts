import { CommandLineInputs, CommandLineOptions, ICommand } from '../definitions';
import { Command, CommandMetadata } from '../lib/command';

@CommandMetadata({
  name: 'ionitron',
  description: 'Print random ionitron messages',
  options: [],
  isProjectTask: false
})
export default class IonitronCommand extends Command implements ICommand {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    this.env.log.msg(inputs, options);
  }
}
