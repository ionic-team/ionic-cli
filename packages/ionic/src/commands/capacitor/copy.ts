import { CommandGroup } from '@ionic/cli-framework';
import chalk from 'chalk';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '../../definitions';

import { CapacitorCommand } from './base';

export class CopyCommand extends CapacitorCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'copy',
      type: 'project',
      summary: 'Copy web assets to native platforms',
      description: `
${chalk.green('ionic capacitor copy')} will do the following:
- Copy the ${chalk.bold('www/')} directory into your native platforms.
      `,
      inputs: [
        {
          name: 'platform',
          summary: `The platform to copy (e.g. ${['android', 'ios', 'electron'].map(v => chalk.green(v)).join(', ')})`,
        },
      ],
      groups: [CommandGroup.Beta],
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    await this.preRunChecks(runinfo);

    if (inputs[0]) {
      await this.checkForPlatformInstallation(inputs[0]);
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [ platform ] = inputs;
    const args = ['copy'];

    if (platform) {
      args.push(platform);
    }

    await this.runCapacitor(args);
  }
}
