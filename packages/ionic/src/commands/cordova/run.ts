import { LOGGER_LEVELS, OptionGroup, createPrefixedFormatter } from '@ionic/cli-framework';
import { onBeforeExit, sleepForever } from '@ionic/cli-framework/utils/process';
import chalk from 'chalk';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandMetadataOption, CommandPreRun } from '../../definitions';
import { COMMON_BUILD_COMMAND_OPTIONS, build } from '../../lib/build';
import { FatalException } from '../../lib/errors';
import { loadConfigXml } from '../../lib/integrations/cordova/config';
import { filterArgumentsForCordova, generateOptionsForCordovaBuild } from '../../lib/integrations/cordova/utils';
import { COMMON_SERVE_COMMAND_OPTIONS, LOCAL_ADDRESSES, serve } from '../../lib/serve';
import { createDefaultLoggerHandlers } from '../../lib/utils/logger';

import { CORDOVA_BUILD_EXAMPLE_COMMANDS, CordovaCommand } from './base';

const CORDOVA_RUN_OPTIONS: ReadonlyArray<CommandMetadataOption> = [
  {
    name: 'debug',
    summary: 'Mark as a debug build',
    type: Boolean,
    groups: ['cordova'],
    hint: chalk.dim('[cordova]'),
  },
  {
    name: 'release',
    summary: 'Mark as a release build',
    type: Boolean,
    groups: ['cordova'],
    hint: chalk.dim('[cordova]'),
  },
  {
    name: 'device',
    summary: 'Deploy build to a device',
    type: Boolean,
    groups: ['cordova'],
    hint: chalk.dim('[cordova]'),
  },
  {
    name: 'emulator',
    summary: 'Deploy build to an emulator',
    type: Boolean,
    groups: ['cordova'],
    hint: chalk.dim('[cordova]'),
  },
  {
    name: 'target',
    summary: `Deploy build to a device (use ${chalk.green('--list')} to see all)`,
    type: String,
    groups: [OptionGroup.Advanced, 'cordova'],
    hint: chalk.dim('[cordova]'),
  },
  {
    name: 'buildConfig',
    summary: 'Use the specified build configuration',
    groups: [OptionGroup.Advanced, 'cordova'],
    hint: chalk.dim('[cordova]'),
  },
];

export class RunCommand extends CordovaCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    let groups: string[] = [];
    const exampleCommands = CORDOVA_BUILD_EXAMPLE_COMMANDS;
    const options: CommandMetadataOption[] = [
      {
        name: 'list',
        summary: 'List all available Cordova targets',
        type: Boolean,
        groups: ['cordova'],
      },
      // Build Options
      {
        name: 'build',
        summary: 'Do not invoke Ionic build',
        type: Boolean,
        default: true,
      },
      ...COMMON_BUILD_COMMAND_OPTIONS.filter(o => !['engine', 'platform'].includes(o.name)),
      // Serve Options
      ...COMMON_SERVE_COMMAND_OPTIONS.filter(o => !['livereload'].includes(o.name)),
      {
        name: 'livereload',
        summary: 'Spin up dev server to live-reload www files',
        type: Boolean,
        aliases: ['l'],
      },
    ];

    const serveRunner = this.project && await this.project.getServeRunner();
    const buildRunner = this.project && await this.project.getBuildRunner();

    if (buildRunner) {
      const libmetadata = await buildRunner.getCommandMetadata();
      groups = libmetadata.groups || [];
      options.push(...libmetadata.options || []);
    }

    if (serveRunner) {
      const libmetadata = await serveRunner.getCommandMetadata();
      const existingOpts = options.map(o => o.name);
      groups = libmetadata.groups || [];
      options.push(...(libmetadata.options || []).filter(o => !existingOpts.includes(o.name)).map(o => ({ ...o, hint: `${o.hint ? `${o.hint} ` : ''}${chalk.dim('(--livereload)')}` })));
    }

    // Cordova Options
    options.push(...CORDOVA_RUN_OPTIONS);

    return {
      name: 'run',
      type: 'project',
      summary: 'Run an Ionic project on a connected device',
      description: `
Like running ${chalk.green('cordova run')} or ${chalk.green('cordova emulate')} directly, but performs ${chalk.green('ionic build')} before deploying to the device or emulator. Optionally specify the ${chalk.green('--livereload')} option to use the dev server from ${chalk.green('ionic serve')} for livereload functionality.

For Android and iOS, you can setup Remote Debugging on your device with browser development tools using these docs${chalk.cyan('[1]')}.

Just like with ${chalk.green('ionic cordova build')}, you can pass additional options to the Cordova CLI using the ${chalk.green('--')} separator.

${chalk.cyan('[1]')}: ${chalk.bold('https://ionicframework.com/docs/developer-resources/developer-tips/')}
      `,
      exampleCommands,
      inputs: [
        {
          name: 'platform',
          summary: `The platform to run (e.g. ${['android', 'ios'].map(v => chalk.green(v)).join(', ')})`,
        },
      ],
      options,
      groups,
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    await this.preRunChecks(runinfo);

    const metadata = await this.getMetadata();

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
    if (!this.project) {
      throw new FatalException(`Cannot run ${chalk.green('ionic cordova run/emulate')} outside a project directory.`);
    }

    const metadata = await this.getMetadata();

    if (options['livereload']) {
      const conf = await loadConfigXml(this.integration);

      onBeforeExit(async () => {
        conf.resetContentSrc();
        await conf.save();
      });

      const cordovalog = this.env.log.clone();
      cordovalog.handlers = createDefaultLoggerHandlers(createPrefixedFormatter(`${chalk.dim(`[cordova]`)} `));
      const cordovalogws = cordovalog.createWriteStream(LOGGER_LEVELS.INFO);

      // TODO: use runner directly
      const details = await serve({ flags: this.env.flags, config: this.env.config, log: this.env.log, prompt: this.env.prompt, shell: this.env.shell, project: this.project }, inputs, generateOptionsForCordovaBuild(metadata, inputs, options));

      if (details.externallyAccessible === false) {
        const extra = LOCAL_ADDRESSES.includes(details.externalAddress) ? '\nEnsure you have proper port forwarding setup from your device to your computer.' : '';
        this.env.log.warn(`Your device or emulator may not be able to access ${chalk.bold(details.externalAddress)}.${extra}\n\n`);
      }

      conf.writeContentSrc(`${details.protocol || 'http'}://${details.externalAddress}:${details.port}`);
      await conf.save();

      await this.runCordova(filterArgumentsForCordova(metadata, options), { stream: cordovalogws });
      await sleepForever();
    } else {
      if (options.build) {
        // TODO: use runner directly
        await build({ config: this.env.config, log: this.env.log, shell: this.env.shell, prompt: this.env.prompt, project: this.project }, inputs, generateOptionsForCordovaBuild(metadata, inputs, options));
      }

      await this.runCordova(filterArgumentsForCordova(metadata, options));
    }
  }
}
