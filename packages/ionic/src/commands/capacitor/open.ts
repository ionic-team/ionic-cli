import chalk from 'chalk';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '@ionic/cli-utils';

import { CapacitorCommand } from './base';

export class OpenCommand extends CapacitorCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'open',
      type: 'project',
      summary: 'Opens the IDE for the specified Capacitor native platform project',
      description: `
${chalk.green('ionic capacitor open')} will do the following:
- Open the IDE with your current native project for that specific platform. This means Xcode for iOS, and Android Studio for Android
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
    const args = [ 'open' ];
    if (platform) {
      args.push(platform);
    }
    await this.runCapacitor(args);
  }
}
