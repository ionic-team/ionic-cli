import chalk from 'chalk';

import { validators } from '@ionic/cli-framework';
import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '@ionic/cli-utils';
import { filterArgumentsForCordova } from '@ionic/cli-utils/lib/integrations/cordova/utils';

import { COMMON_CORDOVA_BUILD_COMMAND_OPTIONS, CordovaCommand } from './base';

export class CompileCommand extends CordovaCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'compile',
      type: 'project',
      summary: 'Compile native platform code',
      description: `
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
          summary: `The platform to compile (${['android', 'ios'].map(v => chalk.green(v)).join(', ')})`,
          validators: [validators.required],
        },
      ],
      options: [
        ...COMMON_CORDOVA_BUILD_COMMAND_OPTIONS,
      ],
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    await this.preRunChecks(runinfo);

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
    await this.runCordova(filterArgumentsForCordova(metadata, options), {});
  }
}
