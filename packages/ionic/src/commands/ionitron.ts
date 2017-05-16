import { CommandLineInputs, CommandLineOptions, Command, CommandMetadata } from '@ionic/cli-utils';
import { getIonitronString, ionitronStatements } from '../lib/ionitron';

@CommandMetadata({
  name: 'ionitron',
  type: 'global',
  description: 'Print random ionitron messages',
  options: [
    {
      name: 'es',
      description: 'Print in spanish',
      type: Boolean,
    }
  ],
  visible: false,
})
export class IonitronCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const locale = options['es'] ? 'es' : 'en';
    const localeStatements = ionitronStatements[locale];
    const statement = localeStatements[Math.floor(Math.random() * (localeStatements.length))];

    this.env.log.msg(getIonitronString(statement));
  }
}
