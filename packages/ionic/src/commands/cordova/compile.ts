import chalk from 'chalk';

import { validators } from '@ionic/cli-framework';
import { CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun, OptionGroup } from '@ionic/cli-utils';
import { filterArgumentsForCordova } from '@ionic/cli-utils/lib/integrations/cordova/utils';

import { CordovaCommand } from './base';

export class CompileCommand extends CordovaCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'compile',
      type: 'project',
      description: 'Compile native platform code',
      longDescription: `
Like running ${chalk.green('cordova compile')} directly, but provides friendly checks.
      `,
      exampleCommands: [
        'ios',
        'ios --device',
        'android',
      ],
      inputs: [
        {
          name: 'platform',
          description: `The platform to compile (${['android', 'ios'].map(v => chalk.green(v)).join(', ')})`,
          validators: [validators.required],
        },
      ],
      options: [
        {
          name: 'debug',
          description: 'Create a Cordova debug build',
          type: Boolean,
          groups: [OptionGroup.Cordova],
        },
        {
          name: 'release',
          description: 'Create a Cordova release build',
          type: Boolean,
          groups: [OptionGroup.Cordova],
        },
        {
          name: 'device',
          description: 'Compile Cordova build to a device',
          type: Boolean,
          groups: [OptionGroup.Cordova],
        },
        {
          name: 'emulator',
          description: 'Compile Cordova build to an emulator',
          type: Boolean,
          groups: [OptionGroup.Cordova],
        },
      ],
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    await this.preRunChecks();

    if (!inputs[0]) {
      const platform = await this.env.prompt({
        type: 'input',
        name: 'platform',
        message: `What platform would you like to compile (${['android', 'ios'].map(v => chalk.green(v)).join(', ')}):`,
      });

      inputs[0] = platform.trim();
    }

    await this.checkForPlatformInstallation(inputs[0]);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const metadata = await this.getMetadata();
    await this.runCordova(filterArgumentsForCordova(metadata, inputs, options), { showExecution: true });
  }
}
