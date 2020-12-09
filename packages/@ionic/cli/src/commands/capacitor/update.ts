import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '../../definitions';
import { input } from '../../lib/color';

import { CapacitorCommand } from './base';

export class UpdateCommand extends CapacitorCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'update',
      type: 'project',
      summary: 'Update Capacitor native platforms, install Capacitor/Cordova plugins',
      description: `
${input('ionic capacitor update')} will do the following:
- Update Capacitor native platform(s) and dependencies
- Install any discovered Capacitor or Cordova plugins
      `,
      inputs: [
        {
          name: 'platform',
          summary: `The platform to update (e.g. ${['android', 'ios'].map(v => input(v)).join(', ')})`,
        },
      ],
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
