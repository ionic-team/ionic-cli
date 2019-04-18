import { MetadataGroup, validators } from '@ionic/cli-framework';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '../../definitions';
import { input } from '../../lib/color';

import { CapacitorCommand } from './base';

export class AddCommand extends CapacitorCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'add',
      type: 'project',
      summary: 'Add a native platform to your Ionic project',
      description: `
${input('ionic capacitor add')} will do the following:
- Add a new platform specific folder to your project (ios, android, or electron)
      `,
      inputs: [
        {
          name: 'platform',
          summary: `The platform to add (e.g. ${['android', 'ios', 'electron'].map(v => input(v)).join(', ')})`,
          validators: [validators.required],
        },
      ],
      groups: [MetadataGroup.BETA],
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    await this.preRunChecks(runinfo);

    if (!inputs[0]) {
      const platform = await this.env.prompt({
        type: 'list',
        name: 'platform',
        message: 'What platform would you like to add?',
        choices: ['android', 'ios', 'electron'],
      });

      inputs[0] = platform.trim();
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [ platform ] = inputs;
    const args = ['add'];

    if (platform) {
      args.push(platform);
    }

    await this.runCapacitor(args);
  }
}
