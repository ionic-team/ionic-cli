import * as chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, CommandPreRun } from '@ionic/cli-utils';
import { Command, CommandMetadata } from '@ionic/cli-utils/lib/command';
import { FatalException } from '@ionic/cli-utils/lib/errors';

@CommandMetadata({
  name: 'ignore',
  type: 'project',
  description: 'Ignore a particular issue',
  visible: false,
  exampleCommands: [
    '',
    '--list',
  ],
  inputs: [
    {
      name: 'id',
      description: 'The issue identifier',
    },
  ],
  options: [
    {
      name: 'list',
      description: 'List issue identifiers',
      type: Boolean,
      aliases: ['l'],
    },
  ],
})
export class DoctorIgnoreCommand extends Command implements CommandPreRun {
  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { Ailments } = await import('@ionic/cli-utils/lib/doctor/ailments');
    const { contains, validate } = await import('@ionic/cli-utils/lib/validators');

    const ailmentIds = Ailments.ALL.map(Ailment => new Ailment().id);

    if (options['list']) {
      this.env.log.msg(ailmentIds.map(id => chalk.green(id)).join('\n'));
      throw new FatalException('', 0);
    }

    if (!inputs[0]) {
      inputs[0] = await this.env.prompt({
        type: 'list',
        name: 'id',
        message: 'Which issue would you like to ignore?',
        choices: ailmentIds,
      });
    }

    validate(inputs[0], 'id', [contains(ailmentIds, {})]);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [ id ] = inputs;
    const config = await this.env.config.load();
    config.state.doctor.ignored.push(id);
    this.env.log.ok(`Ignored issue ${chalk.green(id)}`);
  }
}
