import { CommandLineInputs, CommandLineOptions } from '../definitions';
import { Command, CommandMetadata } from '../lib/command';

@CommandMetadata({
  name: 'ionitron',
  description: 'Print random ionitron messages',
  options: [],
  isProjectTask: false
})
export class IonitronCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    this.env.log.msg(inputs, options);
  }
}
