import chalk from 'chalk';

import { onBeforeExit } from '@ionic/cli-framework/utils/process';

import {
  BuildOptions,
  CommandInstanceInfo,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  CommandMetadataOption,
  CommandPreRun,
  OptionGroup,
  ServeOptions,
} from '@ionic/cli-utils';

import { FatalException, RunnerNotFoundException } from '@ionic/cli-utils/lib/errors';
import { BuildRunner, COMMON_BUILD_COMMAND_OPTIONS } from '@ionic/cli-utils/lib/build';
import { COMMON_SERVE_COMMAND_OPTIONS, LOCAL_ADDRESSES, ServeRunner } from '@ionic/cli-utils/lib/serve';
import { filterArgumentsForCordova, generateBuildOptions } from '@ionic/cli-utils/lib/integrations/cordova/utils';

import { CORDOVA_BUILD_EXAMPLE_COMMANDS, CordovaCommand } from './base';

export class RunCommand extends CordovaCommand implements CommandPreRun {
  protected runner?: ServeRunner<ServeOptions> | BuildRunner<BuildOptions<any>>;

  async getRunner(livereload: boolean) {
    if (!this.runner) {
      this.runner = livereload
        ? await ServeRunner.createFromProjectType(this.env, this.env.project.type)
        : await BuildRunner.createFromProjectType(this.env, this.env.project.type);
    }

    return this.runner;
  }

  async getExtendedMetadata({livereload}: {livereload: boolean}): Promise<CommandMetadata> {
    const metadata = await this.getMetadata();
    try {
      const runner = await this.getRunner(livereload);
      const libmetadata = await runner.getCommandMetadata();

      if (metadata.options) {
        if (livereload) {
          metadata.options = metadata.options.concat(
            COMMON_SERVE_COMMAND_OPTIONS.map(o => o.name === 'livereload' ? {
              name: 'livereload',
              summary: 'Spin up dev server to live-reload www files',
              type: Boolean,
              aliases: ['l'],
            } : o)
          );
        } else {
          metadata.options = metadata.options.concat(COMMON_BUILD_COMMAND_OPTIONS);
        }

        metadata.options = metadata.options.concat(libmetadata.options || []);
      }
    } catch (e) {
      if (!(e instanceof RunnerNotFoundException)) {
        throw e;
      }
    }

    return metadata;
  }

  async getMetadata(): Promise<CommandMetadata> {
    const options: CommandMetadataOption[] = [
      {
        name: 'list',
        summary: 'List all available Cordova targets',
        type: Boolean,
        groups: [OptionGroup.Cordova],
      },
      // Build Options
      {
        name: 'build',
        summary: 'Do not invoke Ionic build/serve',
        type: Boolean,
        default: true,
      },
      // Cordova Options
      {
        name: 'debug',
        summary: 'Mark as a debug build',
        type: Boolean,
        groups: [OptionGroup.Cordova],
        hint: 'cordova',
      },
      {
        name: 'release',
        summary: 'Mark as a release build',
        type: Boolean,
        groups: [OptionGroup.Cordova],
        hint: 'cordova',
      },
      {
        name: 'device',
        summary: 'Deploy build to a device',
        type: Boolean,
        groups: [OptionGroup.Cordova],
        hint: 'cordova',
      },
      {
        name: 'emulator',
        summary: 'Deploy build to an emulator',
        type: Boolean,
        groups: [OptionGroup.Cordova],
        hint: 'cordova',
      },
      {
        name: 'cordova-target',
        summary: `Deploy build to a device (use ${chalk.green('--list')} to see all)`,
        type: String,
        groups: [OptionGroup.Advanced, OptionGroup.Cordova],
        hint: 'cordova',
      },
      {
        name: 'buildConfig',
        summary: 'Use the specified build configuration',
        groups: [OptionGroup.Advanced, OptionGroup.Cordova],
        hint: 'cordova',
      },
    ];

    return {
      name: 'run',
      type: 'project',
      summary: 'Run an Ionic project on a connected device',
      description: `
Like running ${chalk.green('cordova run')} or ${chalk.green('cordova emulate')} directly, but also uses the dev server from ${chalk.green('ionic serve')} for livereload functionality.

For Android and iOS, you can setup Remote Debugging on your device with browser development tools using these docs${chalk.cyan('[1]')}.

Just like with ${chalk.green('ionic cordova build')}, you can pass additional options to the Cordova CLI using the ${chalk.green('--')} separator.

${chalk.cyan('[1]')}: ${chalk.bold('https://ionicframework.com/docs/developer-resources/developer-tips/')}
      `,
      exampleCommands: CORDOVA_BUILD_EXAMPLE_COMMANDS,
      inputs: [
        {
          name: 'platform',
          summary: `The platform to run (e.g. ${['android', 'ios'].map(v => chalk.green(v)).join(', ')})`,
        },
      ],
      options,
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    await this.preRunChecks(runinfo);

    options['livereload'] = options['livereload'] !== undefined ? options['livereload'] : options['l'];

    if (options['noproxy']) {
      this.env.log.warn(`The ${chalk.green('--noproxy')} option has been deprecated. Please use ${chalk.green('--no-proxy')}.`);
      options['proxy'] = false;
    }

    if (options['x']) {
      options['proxy'] = false;
    }

    if (!options['build'] && options['livereload']) {
      this.env.log.warn(`No livereload with ${chalk.green('--no-build')}.`);
      options['livereload'] = false;
    }

    const metadata = await this.getExtendedMetadata({livereload: !!options['livereload']});

    if (options['list']) {
      if (!options['device'] && !options['emulator']) {
        if (metadata.name === 'emulate') {
          options['emulator'] = true;
        }
      }

      const args = filterArgumentsForCordova(metadata, options);
      await this.runCordova(['run', ...args.slice(1)], {});
      throw new FatalException('', 0);
    }

    if (!inputs[0]) {
      const platform = await this.env.prompt({
        type: 'input',
        name: 'platform',
        message: `What platform would you like to run (${['android', 'ios'].map(v => chalk.green(v)).join(', ')}):`,
      });

      inputs[0] = platform.trim();
    }

    await this.checkForPlatformInstallation(inputs[0]);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { loadConfigXml } = await import('@ionic/cli-utils/lib/integrations/cordova/config');

    const conf = await loadConfigXml({ project: this.env.project });

    options['livereload'] = options['livereload'] !== undefined ? options['livereload'] : options['l'];

    onBeforeExit(async () => {
      conf.resetContentSrc();
      await conf.save();
    });

    const metadata = await this.getExtendedMetadata({livereload: !!options['livereload']});

    if (options['livereload']) {
      const { serve } = await import('@ionic/cli-utils/lib/serve');
      const details = await serve(this.env, inputs, generateBuildOptions(metadata, inputs, options));

      if (details.externallyAccessible === false) {
        const extra = LOCAL_ADDRESSES.includes(details.externalAddress) ? '\nEnsure you have proper port forwarding setup from your device to your computer.' : '';
        this.env.log.warn(`Your device or emulator may not be able to access ${chalk.bold(details.externalAddress)}.${extra}\n\n`);
      }

      conf.writeContentSrc(`${details.protocol || 'http'}://${details.externalAddress}:${details.port}`);
      await conf.save();
    } else {
      if (options.build) {
        const { build } = await import('@ionic/cli-utils/lib/build');
        await build(this.env, inputs, generateBuildOptions(metadata, inputs, options));
      }
    }

    // TODO
    // await this.runCordova(filterArgumentsForCordova(metadata, options), { logOptions: { prefix: chalk.dim('[cordova]'), wrap: false } });
    await this.runCordova(filterArgumentsForCordova(metadata, options));
  }
}
