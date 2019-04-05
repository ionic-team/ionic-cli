import { CommandGroup } from '@ionic/cli-framework';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '../../definitions';
import { input } from '../../lib/color';

import { CapacitorCommand } from './base';

export class SyncCommand extends CapacitorCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'sync',
      type: 'project',
      summary: 'Sync (copy + update) an Ionic project',
      description: `
${input('ionic capacitor sync')} will do the following:
- Copy web assets to all Capacitor native platforms
- Update each Capacitor native platforms, such as any dependencies that need updating.
- Install any discovered Capacitor or Cordova plugins.
      `,
      inputs: [
        {
          name: 'platform',
          summary: `The platform to sync (e.g. ${['android', 'ios', 'electron'].map(v => input(v)).join(', ')})`,
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
    const args = ['sync'];

    if (platform) {
      args.push(platform);
    }

    await this.runCapacitor(args);
  }
}
