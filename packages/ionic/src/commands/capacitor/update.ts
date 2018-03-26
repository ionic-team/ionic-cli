import chalk from 'chalk';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '@ionic/cli-utils';

import { CapacitorCommand } from './base';

export class UpdateCommand extends CapacitorCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'update',
      type: 'project',
      summary: 'Updates each Capacitor native platform, and installs any Capacitor/Cordova plugins found',
      description: `
${chalk.green('ionic capacitor update')} will do the following:
- Update each Capacitor native project, such as any dependencies that need updating.
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
