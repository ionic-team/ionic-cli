import chalk from 'chalk';

import { contains, validate } from '@ionic/cli-framework/lib';
import { CommandLineInputs, CommandLineOptions, CommandPreRun } from '@ionic/cli-utils';
import { Command, CommandMetadata } from '@ionic/cli-utils/lib/command';

@CommandMetadata({
  name: 'ignore',
  type: 'project',
  description: 'Ignore a particular issue',
  exampleCommands: [
    '',
    'git-not-used',
  ],
  inputs: [
    {
      name: 'id',
      description: 'The issue identifier',
    },
  ],
})
export class DoctorIgnoreCommand extends Command implements CommandPreRun {
  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { Ailments } = await import('@ionic/cli-utils/lib/doctor/ailments');

    const ailmentIds = Ailments.ALL.map(Ailment => new Ailment().id);

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
