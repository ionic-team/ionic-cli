import chalk from 'chalk';

import {
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  CommandPreRun,
  OptionGroup,
  ServeOptions,
} from '@ionic/cli-utils';

import { FatalException, RunnerNotFoundException } from '@ionic/cli-utils/lib/errors';
import { COMMON_SERVE_COMMAND_OPTIONS, LOCAL_ADDRESSES, ServeRunner } from '@ionic/cli-utils/lib/serve';
import { filterArgumentsForCordova, generateBuildOptions } from '@ionic/cli-utils/lib/integrations/cordova/utils';

import { CORDOVA_BUILD_EXAMPLE_COMMANDS, CordovaCommand } from './base';

export class RunCommand extends CordovaCommand implements CommandPreRun {
  protected serveRunner?: ServeRunner<ServeOptions>;

  async getRunner() {
    if (!this.serveRunner) {
      this.serveRunner = await ServeRunner.createFromProjectType(this.env, this.env.project.type);
    }

    return this.serveRunner;
  }

  async getMetadata(): Promise<CommandMetadata> {
    const metadata: CommandMetadata = {
      name: 'run',
      type: 'project',
      description: 'Run an Ionic project on a connected device',
      longDescription: `
Like running ${chalk.green('cordova run')} directly, but also watches for changes in web assets and provides live-reload functionality with the ${chalk.green('--livereload')} option.

For Android and iOS, you can setup Remote Debugging on your device with browser development tools: ${chalk.bold('https://ionicframework.com/docs/developer-resources/developer-tips/')}

Just like with ${chalk.green('ionic cordova build')}, you can pass additional options to the Cordova CLI using the ${chalk.green('--')} separator.`,
      exampleCommands: CORDOVA_BUILD_EXAMPLE_COMMANDS,
      inputs: [
        {
          name: 'platform',
          description: `The platform to run (${['android', 'ios'].map(v => chalk.green(v)).join(', ')})`,
        },
      ],
      options: [
        {
          name: 'list',
          description: 'List all available Cordova targets',
          type: Boolean,
          groups: [OptionGroup.Cordova],
        },
        ...COMMON_SERVE_COMMAND_OPTIONS,
        // Build Options
        {
          name: 'build',
          description: 'Do not invoke Ionic build/serve',
          type: Boolean,
          default: true,
        },
        // Cordova Options
        {
          name: 'debug',
          description: 'Mark as a debug build',
          type: Boolean,
          groups: [OptionGroup.Cordova],
          hint: 'cordova',
        },
        {
          name: 'release',
          description: 'Mark as a release build',
          type: Boolean,
          groups: [OptionGroup.Cordova],
          hint: 'cordova',
        },
        {
          name: 'device',
          description: 'Deploy build to a device',
          type: Boolean,
          groups: [OptionGroup.Cordova],
          hint: 'cordova',
        },
        {
          name: 'emulator',
          description: 'Deploy build to an emulator',
          type: Boolean,
          groups: [OptionGroup.Cordova],
          hint: 'cordova',
        },
        {
          name: 'cordova-target',
          description: `Deploy build to a device (use ${chalk.green('--list')} to see all)`,
          type: String,
          groups: [OptionGroup.Advanced, OptionGroup.Cordova],
          hint: 'cordova',
        },
        {
          name: 'buildConfig',
          description: 'Use the specified build configuration',
          groups: [OptionGroup.Advanced, OptionGroup.Cordova],
          hint: 'cordova',
        },
      ],
    };

    try {
      const runner = await this.getRunner();
      return runner.specializeCommandMetadata(metadata);
    } catch (e) {
      if (!(e instanceof RunnerNotFoundException)) {
        throw e;
      }
    }

    return metadata;
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    await this.preRunChecks();

    if (options['noproxy']) {
      this.env.log.warn(`The ${chalk.green('--noproxy')} option has been deprecated. Please use ${chalk.green('--no-proxy')}.`);
      options['proxy'] = false;
    }

    if (options['x']) {
      options['proxy'] = false;
    }

    const metadata = await this.getMetadata();

    if (!options['device'] && !options['emulator']) {
      if (metadata.name === 'run') {
        options['device'] = true;
      } else if (metadata.name === 'emulate') {
        options['emulator'] = true;
      }
    }

    if (options['list']) {
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
    const { ConfigXml } = await import('@ionic/cli-utils/lib/integrations/cordova/config');
    const { registerShutdownFunction } = await import('@ionic/cli-utils/lib/process');

    const conf = await ConfigXml.load(this.env.project.directory);

    registerShutdownFunction(() => {
      conf.resetContentSrc();
      conf.saveSync();
    });

    const metadata = await this.getMetadata();

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

    await this.runCordova(filterArgumentsForCordova(metadata, options), { logOptions: { prefix: chalk.dim('[cordova]'), wrap: false } });
  }
}
