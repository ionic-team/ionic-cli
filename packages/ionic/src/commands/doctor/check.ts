import chalk from 'chalk';

import { contains, validate } from '@ionic/cli-framework';
import { CommandLineInputs, CommandLineOptions, CommandMetadata, IAilment, isTreatableAilment } from '@ionic/cli-utils';
import { FatalException } from '@ionic/cli-utils/lib/errors';

import { DoctorCommand } from './base';

export class DoctorCheckCommand extends DoctorCommand {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'check',
      type: 'project',
      summary: 'Check the health of your Ionic project',
      description: `
This command detects and prints common issues and suggested steps to fix them.

Some issues can be fixed automatically. See ${chalk.green('ionic doctor treat --help')}.

Optionally supply the ${chalk.green('id')} argument to check a single issue. Use ${chalk.green('ionic doctor list')} to list all known issues.
      `,
      exampleCommands: [
        '',
        'git-not-used',
      ],
      inputs: [
        {
          name: 'id',
          summary: 'The issue identifier',
        },
      ],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [ id ] = inputs;

    if (id) {
      const registry = await this.getRegistry();
      const ailmentIds = registry.ailments.map(ailment => ailment.id);
      validate(id, 'id', [contains(ailmentIds, {})]);
      const ailment = registry.get(id);

      if (!ailment) {
        throw new FatalException(`Issue not found by ID: ${chalk.green(id)}`);
      }

      await this.checkAilment(ailment);
    } else {
      const ailments = await this.detectAilments();
      await this.checkAilments(ailments);
    }
  }

  async checkAilments(ailments: IAilment[]) {
    let treatableAilments = 0;

    if (ailments.length > 0) {
      for (const ailment of ailments) {
        if (isTreatableAilment(ailment)) {
          treatableAilments += 1;
        }

        await this.checkAilment(ailment);
      }
    }

    const msg = (
      'Doctor Summary\n' +
      `- Detected ${chalk.bold(String(ailments.length))} issue${ailments.length === 1 ? '' : 's'}.` +
      `${ailments.length === 0 ? ' Aww yeah! 💪' : ''}\n` +
      `- ${chalk.bold(String(treatableAilments))} issue${treatableAilments === 1 ? '' : 's'} can be fixed automatically${treatableAilments > 0 ? ` by running: ${chalk.green('ionic doctor fix')}` : ''}`
    );

    if (ailments.length > 0) {
      this.env.log.info(msg);
      throw new FatalException(''); // exit 1
    } else {
      this.env.log.ok(msg);
    }
  }

  async checkAilment(ailment: IAilment) {
    const { formatAilmentMessage } = await import('@ionic/cli-utils/lib/doctor');

    this.env.log.warn(await formatAilmentMessage(ailment));
  }
}
