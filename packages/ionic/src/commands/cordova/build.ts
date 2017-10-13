import * as chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, CommandPreRun } from '@ionic/cli-utils';
import { CommandMetadata } from '@ionic/cli-utils/lib/command';
import { CORDOVA_INTENT, filterArgumentsForCordova, generateBuildOptions } from '@ionic/cli-utils/lib/cordova/utils';
import { APP_SCRIPTS_OPTIONS } from '@ionic/cli-utils/lib/ionic-angular/app-scripts';

import { CordovaCommand } from './base';

@CommandMetadata({
  name: 'build',
  type: 'project',
  description: 'Build (prepare + compile) an Ionic project for a given platform',
  longDescription: `
Like running ${chalk.green('cordova build')} directly, but also builds web assets and provides friendly checks.

To pass additional options to the Cordova CLI, use the ${chalk.green('--')} separator after the Ionic CLI arguments. For example, for verbose log output from Cordova during an iOS build, one would use ${chalk.green('ionic cordova build ios -- -d')}. See additional examples below.
  `,
  exampleCommands: [
    'ios',
    'ios --prod --release',
    'ios --device --prod --release -- --developmentTeam="ABCD" --codeSignIdentity="iPhone Developer" --packageType="app-store"',
    'android',
    'android --prod --release -- -- --keystore=filename.keystore --alias=myalias',
    'android --prod --release -- -- --minSdkVersion=21',
    'android --prod --release -- -- --versionCode=55',
    'android --prod --release -- -- --gradleArg=-PcdvBuildMultipleApks=true',
  ],
  inputs: [
    {
      name: 'platform',
      description: `The platform to build (${['android', 'ios'].map(v => chalk.green(v)).join(', ')})`,
    }
  ],
  options: [
    // Build Options
    {
      name: 'build',
      description: 'Do not invoke an Ionic build',
      type: Boolean,
      default: true,
    },
    ...APP_SCRIPTS_OPTIONS,
    // Cordova Options
    {
      name: 'debug',
      description: 'Create a Cordova debug build',
      type: Boolean,
      intents: [CORDOVA_INTENT],
    },
    {
      name: 'release',
      description: 'Create a Cordova release build',
      type: Boolean,
      intents: [CORDOVA_INTENT],
    },
    {
      name: 'device',
      description: 'Deploy Cordova build to a device',
      type: Boolean,
      intents: [CORDOVA_INTENT],
    },
    {
      name: 'emulator',
      description: 'Deploy Cordova build to an emulator',
      type: Boolean,
      intents: [CORDOVA_INTENT],
    },
    {
      name: 'buildConfig',
      description: 'Use the specified Cordova build configuration',
      intents: [CORDOVA_INTENT],
      advanced: true,
    },
  ]
})
export class BuildCommand extends CordovaCommand implements CommandPreRun {
  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    await this.preRunChecks();

    if (!inputs[0]) {
      const platform = await this.env.prompt({
        type: 'input',
        name: 'platform',
        message: `What platform would you like to build (${['android', 'ios'].map(v => chalk.green(v)).join(', ')}):`
      });

      inputs[0] = platform.trim();
    }

    await this.checkForPlatformInstallation(inputs[0]);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (options.build) {
      const { build } = await import('@ionic/cli-utils/commands/build');
      await build(this.env, inputs, generateBuildOptions(this.metadata, options));
    }

    const response = await this.runCordova(filterArgumentsForCordova(this.metadata, inputs, options));
    this.env.log.msg(response);
  }
}
