import chalk from 'chalk';

import { contains, validate, validators } from '@ionic/cli-framework';
import { CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';

export class DoctorIgnoreCommand extends Command implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'ignore',
      type: 'project',
      summary: 'Ignore a particular issue',
      exampleCommands: [
        '',
        'git-not-used',
      ],
      inputs: [
        {
          name: 'id',
          summary: 'The issue identifier',
          validators: [validators.required],
        },
      ],
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const registry = await this.env.project.getAilmentRegistry(this.env);
    const ailmentIds = registry.ailments.map(ailment => ailment.id);

    if (!inputs[0]) {
      inputs[0] = await this.env.prompt({
        type: 'list',
        name: 'id',
        message: 'Which issue would you like to ignore?',
        choices: ailmentIds,
      });
    }

    validate(inputs[0], 'id', [contains(ailmentIds, {})]); // TODO: add to input validators
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [ id ] = inputs;
    const config = await this.env.config.load();
    config.state.doctor.ignored.push(id);
    this.env.log.ok(`Ignored issue ${chalk.green(id)}`);
  }
}
