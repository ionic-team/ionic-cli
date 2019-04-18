import { validators } from '@ionic/cli-framework';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '../../definitions';
import { input } from '../../lib/color';
import { filterArgumentsForCordova } from '../../lib/integrations/cordova/utils';

import { CORDOVA_COMPILE_OPTIONS, CordovaCommand } from './base';

export class CompileCommand extends CordovaCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'compile',
      type: 'project',
      summary: 'Compile native platform code',
      description: `
Like running ${input('cordova compile')} directly, but provides friendly checks.
      `,
      exampleCommands: [
        'ios',
        'ios --device',
        'android',
      ],
      inputs: [
        {
          name: 'platform',
          summary: `The platform to compile (${['android', 'ios'].map(v => input(v)).join(', ')})`,
          validators: [validators.required],
        },
      ],
      options: [
        ...CORDOVA_COMPILE_OPTIONS,
      ],
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    await this.preRunChecks(runinfo);

    if (!inputs[0]) {
      const platform = await this.env.prompt({
        type: 'input',
        name: 'platform',
        message: `What platform would you like to compile (${['android', 'ios'].map(v => input(v)).join(', ')}):`,
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
