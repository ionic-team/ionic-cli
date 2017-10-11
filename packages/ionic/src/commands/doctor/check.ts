import { CommandLineInputs, CommandLineOptions } from '@ionic/cli-utils';
import { Command, CommandMetadata } from '@ionic/cli-utils/lib/command';

@CommandMetadata({
  name: 'check',
  type: 'project',
  description: 'Check the health of your Ionic project',
  visible: false,
})
export class DoctorCheckCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { treatAilments } = await import('@ionic/cli-utils/lib/doctor/index');
    await treatAilments(this.env);
  }
}
