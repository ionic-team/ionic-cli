import chalk from 'chalk';

import { validators } from '@ionic/cli-framework';
import { CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun, OptionGroup } from '@ionic/cli-utils';
import { filterArgumentsForCordova, generateBuildOptions } from '@ionic/cli-utils/lib/integrations/cordova/utils';
import { APP_SCRIPTS_OPTIONS } from '@ionic/cli-utils/lib/project/ionic-angular/app-scripts';

import { CORDOVA_BUILD_EXAMPLE_COMMANDS, CordovaCommand } from './base';

export class BuildCommand extends CordovaCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'build',
      type: 'project',
      description: 'Build (prepare + compile) an Ionic project for a given platform',
      longDescription: `
Like running ${chalk.green('cordova build')} directly, but also builds web assets and provides friendly checks.

To pass additional options to the Cordova CLI, use the ${chalk.green('--')} separator after the Ionic CLI arguments.

The Cordova CLI requires a separator for platform-specific arguments for Android builds${chalk.cyan('[1]')}, so an additional separator is required for the Ionic CLI, but it is not required for iOS builds${chalk.cyan('[2]')}. See the example commands for usage with separators. To avoid using flags, consider using ${chalk.green('--buildConfig')} with a ${chalk.bold('build.json')} file.

${chalk.cyan('[1]')}: ${chalk.bold('https://cordova.apache.org/docs/en/latest/guide/platforms/android/index.html#using-flags')}
${chalk.cyan('[2]')}: ${chalk.bold('https://cordova.apache.org/docs/en/latest/guide/platforms/ios/index.html#using-flags')}
      `,
      exampleCommands: CORDOVA_BUILD_EXAMPLE_COMMANDS,
      inputs: [
        {
          name: 'platform',
          description: `The platform to build (${['android', 'ios'].map(v => chalk.green(v)).join(', ')})`,
          validators: [validators.required],
        },
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
          description: 'Create a Cordova build for a device',
          type: Boolean,
          groups: [OptionGroup.Cordova],
        },
        {
          name: 'emulator',
          description: 'Create a Cordova build for an emulator',
          type: Boolean,
          groups: [OptionGroup.Cordova],
        },
        {
          name: 'buildConfig',
          description: 'Use the specified Cordova build configuration',
          groups: [OptionGroup.Advanced, OptionGroup.Cordova],
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
        message: `What platform would you like to build (${['android', 'ios'].map(v => chalk.green(v)).join(', ')}):`,
      });

      inputs[0] = platform.trim();
    }

    await this.checkForPlatformInstallation(inputs[0]);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const metadata = await this.getMetadata();

    if (options.build) {
      const { build } = await import('@ionic/cli-utils/lib/build');
      await build(this.env, inputs, generateBuildOptions(metadata, options));
    }

    const cordovaArgs = filterArgumentsForCordova(metadata, options);
    await this.runCordova(cordovaArgs, {});
  }
}
