import chalk from 'chalk';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '@ionic/cli-utils';

import { CapacitorCommand } from './base';

export class InitCommand extends CapacitorCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'init',
      type: 'project',
      summary: 'Initializes Capacitor in your Ionic project',
      description: `
${chalk.green('ionic capacitor init')} will do the following:
- Prompt for 
      `,
      exampleCommands: [],
      inputs: []
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    await this.preRunChecks(runinfo);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    await this.runCapacitor(['init']);
  }
}
