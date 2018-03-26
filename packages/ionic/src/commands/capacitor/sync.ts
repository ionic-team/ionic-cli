import chalk from 'chalk';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '@ionic/cli-utils';

import { CapacitorCommand } from './base';

export class SyncCommand extends CapacitorCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'sync',
      type: 'project',
      summary: 'Syncs your Capacitor project, equivalent to performing a "copy followed by an "update"',
      description: `
${chalk.green('ionic capacitor sync')} will do the following:
- Copy web assets to all Capacitor native platforms 
- Update each Capacitor native platforms, such as any dependencies that need updating.
- Install any discovered Capacitor or Cordova plugins.
      `,
      exampleCommands: [],
      inputs: [],
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    await this.preRunChecks(runinfo);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [ platform ] = inputs;
    await this.runCapacitor(['update', platform]);
  }
}
