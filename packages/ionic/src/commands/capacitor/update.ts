import { CommandGroup } from '@ionic/cli-framework';
import chalk from 'chalk';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '../../definitions';

import { CapacitorCommand } from './base';

export class UpdateCommand extends CapacitorCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'update',
      type: 'project',
      summary: 'Update Capacitor native platforms, install Capacitor/Cordova plugins',
      description: `
${chalk.green('ionic capacitor update')} will do the following:
- Update each Capacitor native project, such as any dependencies that need updating.
- Install any discovered Capacitor or Cordova plugins.
      `,
      inputs: [
        {
          name: 'platform',
          summary: `The platform to update (e.g. ${['android', 'ios', 'electron'].map(v => chalk.green(v)).join(', ')})`,
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
    const args = ['update'];

    if (platform) {
      args.push(platform);
    }

    await this.runCapacitor(args);
  }
}
