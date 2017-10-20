import chalk from 'chalk';

import { contains, validate } from '@ionic/cli-framework/lib';
import { CommandLineInputs, CommandLineOptions } from '@ionic/cli-utils';
import { Command, CommandMetadata } from '@ionic/cli-utils/lib/command';
import { FatalException } from '@ionic/cli-utils/lib/errors';

@CommandMetadata({
  name: 'check',
  type: 'project',
  description: 'Check the health of your Ionic project',
  inputs: [
    {
      name: 'id',
      description: 'The issue identifier',
      required: false,
    }
  ],
})
export class DoctorCheckCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [ id ] = inputs;

    const { detectAndTreatAilment, registry, treatAilments } = await import('@ionic/cli-utils/lib/doctor/index');
    const { Ailments } = await import('@ionic/cli-utils/lib/doctor/ailments');

    const ailmentIds = Ailments.ALL.map(Ailment => new Ailment().id);

    if (id) {
      validate(id, 'id', [contains(ailmentIds, {})]);
      const ailment = registry.get(id);

      if (!ailment) {
        throw new FatalException(`Issue not found by ID: ${chalk.green(id)}`);
      }

      await detectAndTreatAilment(this.env, ailment);
    } else {
      await treatAilments(this.env);
    }
  }
}
