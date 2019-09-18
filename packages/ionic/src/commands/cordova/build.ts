import { CommandMetadataOption, Footnote, validators } from '@ionic/cli-framework';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '../../definitions';
import { input, strong } from '../../lib/color';
import { FatalException, RunnerException } from '../../lib/errors';
import { filterArgumentsForCordova, generateOptionsForCordovaBuild } from '../../lib/integrations/cordova/utils';

import { CORDOVA_BUILD_EXAMPLE_COMMANDS, CORDOVA_COMPILE_OPTIONS, CordovaCommand } from './base';

export class BuildCommand extends CordovaCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    const exampleCommands = CORDOVA_BUILD_EXAMPLE_COMMANDS.sort();
    const options: CommandMetadataOption[] = [
      // Build Options
      {
        name: 'build',
        summary: 'Do not invoke an Ionic build',
        type: Boolean,
        default: true,
      },
      ...CORDOVA_COMPILE_OPTIONS,
    ];

    const footnotes: Footnote[] = [
      {
        id: 'cordova-android-using-flags',
        url: 'https://cordova.apache.org/docs/en/latest/guide/platforms/android/index.html#using-flags',
      },
      {
        id: 'cordova-ios-using-flags',
        url: 'https://cordova.apache.org/docs/en/latest/guide/platforms/ios/index.html#using-flags',
      },
    ];

    const runner = this.project && await this.project.getBuildRunner();

    if (runner) {
      const libmetadata = await runner.getCommandMetadata();
      options.push(...(libmetadata.options || []).filter(o => o.groups && o.groups.includes('cordova')));
      footnotes.push(...libmetadata.footnotes || []);
    }

    return {
      name: 'build',
      type: 'project',
      summary: 'Build (prepare + compile) an Ionic project for a given platform',
      description: `
Like running ${input('cordova build')} directly, but also builds web assets with configuration from ${input('ionic build')} and provides friendly checks.

To pass additional options to the Cordova CLI, use the ${input('--')} separator after the Ionic CLI arguments.

The Cordova CLI requires a separator for platform-specific arguments for Android builds[^cordova-android-using-flags], so an additional separator is required for the Ionic CLI, but it is not required for iOS builds[^cordova-ios-using-flags]. See the example commands for usage with separators. To avoid using flags, consider using ${input('--buildConfig')} with a ${strong('build.json')} file.
      `,
      footnotes,
      exampleCommands,
      inputs: [
        {
          name: 'platform',
          summary: `The platform to build (e.g. ${['android', 'ios'].map(v => input(v)).join(', ')})`,
          validators: [validators.required],
        },
      ],
      options,
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    await this.preRunChecks(runinfo);

    if (!inputs[0]) {
      const platform = await this.env.prompt({
        type: 'input',
        name: 'platform',
        message: `What platform would you like to build (${['android', 'ios'].map(v => input(v)).join(', ')}):`,
      });

      inputs[0] = platform.trim();
    }

    await this.checkForPlatformInstallation(inputs[0]);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const metadata = await this.getMetadata();

    if (!this.project) {
      throw new FatalException(`Cannot run ${input('ionic cordova build')} outside a project directory.`);
    }

    if (options.build) {
      try {
        const runner = await this.project.requireBuildRunner();
        const runnerOpts = runner.createOptionsFromCommandLine(inputs, generateOptionsForCordovaBuild(metadata, inputs, options));
        await runner.run(runnerOpts);
      } catch (e) {
        if (e instanceof RunnerException) {
          throw new FatalException(e.message);
        }

        throw e;
      }
    }

    const cordovaArgs = filterArgumentsForCordova(metadata, options);
    await this.runCordova(cordovaArgs, { stdio: 'inherit' });
  }
}
