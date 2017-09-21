import * as chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, CommandPreRun } from '@ionic/cli-utils';
import { CommandMetadata } from '@ionic/cli-utils/lib/command';

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
    'ios --device --prod --release -- --developmentTeam="ABCD" --codeSignIdentity="iPhone Developer" --provisioningProfile="UUID"',
    'android',
    'android --prod --release -- -- --keystore=filename.keystore --alias=myalias',
    'android --prod --release -- -- --minSdkVersion=21',
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
    {
      name: 'prod',
      description: 'Build the application for production',
      type: Boolean,
      intent: 'app-scripts',
    },
    {
      name: 'aot',
      description: 'Perform ahead-of-time compilation for this build',
      type: Boolean,
      intent: 'app-scripts',
      advanced: true,
    },
    {
      name: 'minifyjs',
      description: 'Minify JS for this build',
      type: Boolean,
      intent: 'app-scripts',
      advanced: true,
    },
    {
      name: 'minifycss',
      description: 'Minify CSS for this build',
      type: Boolean,
      intent: 'app-scripts',
      advanced: true,
    },
    {
      name: 'optimizejs',
      description: 'Perform JS optimizations for this build',
      type: Boolean,
      intent: 'app-scripts',
      advanced: true,
    },
    // Cordova Options
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
      description: 'Deploy Cordova build to a device',
      type: Boolean,
      intent: 'cordova',
    },
    {
      name: 'emulator',
      description: 'Deploy Cordova build to an emulator',
      type: Boolean,
      intent: 'cordova',
    },
    {
      name: 'buildConfig',
      description: 'Use the specified Cordova build configuration',
      intent: 'cordova',
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
    const { filterArgumentsForCordova, generateBuildOptions } = await import('@ionic/cli-utils/lib/cordova/utils');

    if (options.build) {
      const { build } = await import('@ionic/cli-utils/commands/build');
      await build(this.env, inputs, generateBuildOptions(this.metadata, options));
    }

    const response = await this.runCordova(filterArgumentsForCordova(this.metadata, inputs, options));
    this.env.log.msg(response);
  }
}
