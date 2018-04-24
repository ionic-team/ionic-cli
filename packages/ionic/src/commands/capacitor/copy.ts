import chalk from 'chalk';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '@ionic/cli-utils';

import { CapacitorCommand } from './base';

export class CopyCommand extends CapacitorCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'copy',
      type: 'project',
      summary: 'Copies web assets to each Capacitor native platform',
      description: `
${chalk.green('ionic capacitor copy')} will do the following:
- Copy the ${chalk.bold('www/')} directory into your native platforms.
      `,
      exampleCommands: [],
      inputs: [],
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    await this.preRunChecks(runinfo);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    await this.runCapacitor(['copy']);
  }
}
