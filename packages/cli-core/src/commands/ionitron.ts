import { CommandLineInputs, CommandLineOptions, Command, CommandMetadata } from '@ionic/cli-utils';

@CommandMetadata({
  name: 'ionitron',
  description: 'Print random ionitron messages',
  options: [],
  isProjectTask: false
})
export class IonitronCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    this.env.log.msg('ionitron');
  }
}
