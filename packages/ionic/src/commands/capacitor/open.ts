import chalk from 'chalk';

import { CommandGroup, validators } from '@ionic/cli-framework';
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
      inputs: [
        {
          name: 'platform',
          summary: `The platform to open (e.g. ${['android', 'ios'].map(v => chalk.green(v)).join(', ')})`,
          validators: [validators.required],
        },
      ],
      groups: [CommandGroup.Beta],
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    await this.preRunChecks(runinfo);

    if (!inputs[0]) {
      const platform = await this.env.prompt({
        type: 'list',
        name: 'platform',
        message: 'What platform would you like to open?',
        choices: ['android', 'ios'],
      });

      inputs[0] = platform.trim();
    }

    await this.checkForPlatformInstallation(inputs[0]);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [ platform ] = inputs;
    const args = ['open'];

    if (platform) {
      args.push(platform);
    }

    await this.runCapacitor(args);
  }
}
