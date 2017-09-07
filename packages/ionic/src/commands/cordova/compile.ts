import * as chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, CommandPreRun } from '@ionic/cli-utils';
import { CommandMetadata } from '@ionic/cli-utils/lib/command';

import { CordovaCommand } from './base';

@CommandMetadata({
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
    },
  ],
  options: [
    {
      name: 'debug',
      description: 'Create a Cordova debug build',
      type: Boolean,
      intent: 'cordova',
    },
    {
      name: 'release',
      description: 'Create a Cordova release build',
      type: Boolean,
      intent: 'cordova',
    },
    {
      name: 'device',
      description: 'Compile Cordova build to a device',
      type: Boolean,
      intent: 'cordova',
    },
    {
      name: 'emulator',
      description: 'Compile Cordova build to an emulator',
      type: Boolean,
      intent: 'cordova',
    },
  ],
})
export class CompileCommand extends CordovaCommand implements CommandPreRun {
  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    await this.preRunChecks();

    if (!inputs[0]) {
      const platform = await this.env.prompt({
        type: 'input',
        name: 'platform',
        message: `What platform would you like to compile (${['android', 'ios'].map(v => chalk.green(v)).join(', ')}):`
      });

      inputs[0] = platform.trim();
    }

    await this.checkForPlatformInstallation(inputs[0]);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { ConfigXml } = await import('@ionic/cli-utils/lib/cordova/config');
    const { filterArgumentsForCordova } = await import('@ionic/cli-utils/lib/cordova/utils');

    const conf = await ConfigXml.load(this.env.project.directory);
    await conf.resetContentSrc();
    await conf.save();

    const response = await this.runCordova(filterArgumentsForCordova(this.metadata, inputs, options));
    this.env.log.msg(response);
  }
}
