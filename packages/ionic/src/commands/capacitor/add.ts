import chalk from 'chalk';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '@ionic/cli-utils';

import { CapacitorCommand } from './base';

export class AddCommand extends CapacitorCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'add',
      type: 'project',
      summary: 'Adds a new Capacitor native platform to your Ionic project',
      description: `
${chalk.green('ionic capacitor add')} will do the following:
- Add a new platform specific folder to your project (ios, android, or electron)
      `,
      exampleCommands: [],
      inputs: [],
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    await this.preRunChecks(runinfo);

    if (inputs.length < 1) {
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
    const args = [ 'add' ];
    if (platform) {
      args.push(platform);
    }
    await this.runCapacitor(args);
  }
}
