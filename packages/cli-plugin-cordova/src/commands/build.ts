import * as chalk from 'chalk';

import {
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  CommandPreRun,
} from '@ionic/cli-utils';

import { generateBuildOptions, filterArgumentsForCordova, CORDOVA_INTENT } from '../lib/utils/cordova';
import { resetConfigXmlContentSrc } from '../lib/utils/configXmlUtils';
import { CordovaCommand } from './base';

@CommandMetadata({
  name: 'build',
  type: 'project',
  description: 'Build (prepare + compile) an Ionic project for a given platform',
  longDescription: `
Like running ${chalk.green('cordova build')} directly, but also builds web assets and provides friendly checks.
  `,
  exampleCommands: [
    'ios',
    'ios --prod --release',
    'ios --device --prod --release -- --developmentTeam="ABCD" --codeSignIdentity="iPhone Developer" --provisioningProfile="UUID"',
    'android',
    'android --prod --release -- -- --minSdkVersion=21',
    'android --prod --release -- -- --gradleArg=-PcdvBuildMultipleApks=true',
  ],
  inputs: [
    {
      name: 'platform',
      description: `The platform to build: ${chalk.green('ios')}, ${chalk.green('android')}`,
    }
  ],
  options: [
    // Build Options
    {
      name: 'prod',
      description: 'Build the application for production',
      type: Boolean,
    },
    {
      name: 'aot',
      description: 'Perform ahead-of-time compilation for this build',
      type: Boolean,
    },
    {
      name: 'minifyjs',
      description: 'Minify JS for this build',
      type: Boolean,
    },
    {
      name: 'minifycss',
      description: 'Minify CSS for this build',
      type: Boolean,
    },
    {
      name: 'optimizejs',
      description: 'Perform JS optimizations for this build',
      type: Boolean,
    },
    // Cordova Options
    {
      name: 'debug',
      description: 'Create a Cordova debug build',
      type: Boolean,
      intent: CORDOVA_INTENT,
    },
    {
      name: 'release',
      description: 'Create a Cordova release build',
      type: Boolean,
      intent: CORDOVA_INTENT,
    },
    {
      name: 'device',
      description: 'Deploy Cordova build to a device',
      type: Boolean,
      intent: CORDOVA_INTENT,
    },
    {
      name: 'emulator',
      description: 'Deploy Cordova build to an emulator',
      type: Boolean,
      intent: CORDOVA_INTENT,
    },
    {
      name: 'buildConfig',
      description: 'Use the specified Cordova build configuration',
      intent: CORDOVA_INTENT,
    },
  ]
})
export class BuildCommand extends CordovaCommand implements CommandPreRun {
  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    await this.checkForAssetsFolder();

    if (!inputs[0]) {
      const platform = await this.env.prompt({
        type: 'input',
        name: 'platform',
        message: `What platform would you like to build: ${chalk.green('ios')}, ${chalk.green('android')}:`
      });

      inputs[0] = platform.trim();
    }

    await this.checkForPlatformInstallation(inputs[0]);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    // ensure the content node was set back to its original src
    await resetConfigXmlContentSrc(this.env.project.directory);

    await this.env.hooks.fire('build:before', { env: this.env });
    await this.env.hooks.fire('command:build', {
      cmd: this,
      env: this.env,
      inputs,
      options: generateBuildOptions(this.metadata, options)
    });
    await this.env.hooks.fire('build:after', { env: this.env });

    const response = await this.runCordova(filterArgumentsForCordova(this.metadata, inputs, options));
    this.env.log.msg(response);
  }
}
