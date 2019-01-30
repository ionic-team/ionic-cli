import { ERROR_SHELL_COMMAND_NOT_FOUND, Footnote, LOGGER_LEVELS, OptionGroup, ShellCommandError, createPrefixedFormatter } from '@ionic/cli-framework';
import { onBeforeExit, processExit, sleepForever } from '@ionic/cli-framework/utils/process';
import chalk from 'chalk';
import * as path from 'path';
import * as url from 'url';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandMetadataOption, CommandPreRun, IShellRunOptions } from '../../definitions';
import { COMMON_BUILD_COMMAND_OPTIONS, build } from '../../lib/build';
import { FatalException } from '../../lib/errors';
import { loadConfigXml } from '../../lib/integrations/cordova/config';
import { filterArgumentsForCordova, generateOptionsForCordovaBuild } from '../../lib/integrations/cordova/utils';
import { COMMON_SERVE_COMMAND_OPTIONS, LOCAL_ADDRESSES, serve } from '../../lib/serve';
import { createDefaultLoggerHandlers } from '../../lib/utils/logger';
import { pkgManagerArgs } from '../../lib/utils/npm';

import { CORDOVA_BUILD_EXAMPLE_COMMANDS, CORDOVA_RUN_OPTIONS, CordovaCommand } from './base';

const CORDOVA_ANDROID_PACKAGE_PATH = 'platforms/android/app/build/outputs/apk/';
const CORDOVA_IOS_SIMULATOR_PACKAGE_PATH = 'platforms/ios/build/emulator';
const CORDOVA_IOS_DEVICE_PACKAGE_PATH = 'platforms/ios/build/device';

const NATIVE_RUN_OPTIONS: ReadonlyArray<CommandMetadataOption> = [
  {
    name: 'native-run',
    summary: `Use ${chalk.green('native-run')} instead of Cordova for running the app`,
    type: Boolean,
    groups: [OptionGroup.Hidden, 'native-run'],
    hint: chalk.dim('[native-run]'),
  },
  {
    name: 'connect',
    summary: 'Do not tie the running app to the process',
    type: Boolean,
    default: true,
    groups: [OptionGroup.Hidden, 'native-run'],
    hint: chalk.dim('[native-run]'),
  },
  {
    name: 'json',
    summary: `Output ${chalk.green('--list')} targets in JSON`,
    type: Boolean,
    groups: [OptionGroup.Hidden, 'native-run'],
    hint: chalk.dim('[native-run]'),
  },
];

export class RunCommand extends CordovaCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    let groups: string[] = [];
    const exampleCommands = [
      ...CORDOVA_BUILD_EXAMPLE_COMMANDS,
      'android -l',
      'ios --livereload',
      'ios --livereload-url=http://localhost:8100',
    ].sort();

    const options: CommandMetadataOption[] = [
      {
        name: 'list',
        summary: 'List all available targets',
        type: Boolean,
        groups: ['cordova', 'cordova-cli', 'native-run'],
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
      {
        name: 'livereload-url',
        summary: 'Provide a custom URL to the dev server',
      },
    ];

    const footnotes: Footnote[] = [
      {
        id: 'remote-debugging-docs',
        url: 'https://ionicframework.com/docs/developer-resources/developer-tips',
        shortUrl: 'https://ion.link/remote-debugging-docs',
      },
    ];

    const serveRunner = this.project && await this.project.getServeRunner();
    const buildRunner = this.project && await this.project.getBuildRunner();

    if (buildRunner) {
      const libmetadata = await buildRunner.getCommandMetadata();
      groups = libmetadata.groups || [];
      options.push(...libmetadata.options || []);
      footnotes.push(...libmetadata.footnotes || []);
    }

    if (serveRunner) {
      const libmetadata = await serveRunner.getCommandMetadata();
      const existingOpts = options.map(o => o.name);
      groups = libmetadata.groups || [];
      options.push(...(libmetadata.options || [])
        .filter(o => !existingOpts.includes(o.name) && o.groups && o.groups.includes('cordova'))
        .map(o => ({ ...o, hint: `${o.hint ? `${o.hint} ` : ''}${chalk.dim('(--livereload)')}` })));
      footnotes.push(...libmetadata.footnotes || []);
    }

    // Cordova Options
    options.push(...CORDOVA_RUN_OPTIONS);

    // `native-run` Options
    options.push(...NATIVE_RUN_OPTIONS);

    return {
      name: 'run',
      type: 'project',
      summary: 'Run an Ionic project on a connected device',
      description: `
Like running ${chalk.green('cordova run')} or ${chalk.green('cordova emulate')} directly, but performs ${chalk.green('ionic build')} before deploying to the device or emulator. Optionally specify the ${chalk.green('--livereload')} option to use the dev server from ${chalk.green('ionic serve')} for livereload functionality.

For Android and iOS, you can setup Remote Debugging on your device with browser development tools using these docs[^remote-debugging-docs].

Just like with ${chalk.green('ionic cordova build')}, you can pass additional options to the Cordova CLI using the ${chalk.green('--')} separator. To pass additional options to the dev server, consider using ${chalk.green('ionic serve')} and the ${chalk.green('--livereload-url')} option.
      `,
      footnotes,
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

    if (options['livereload-url']) {
      options['livereload'] = true;
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

      if (options['native-run']) {
        const args = createNativeRunListArgs(inputs, options);
        await this.nativeRun(args);
      } else {
        const args = filterArgumentsForCordova(metadata, options);
        await this.runCordova(['run', ...args.slice(1)], {});
      }

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
      let livereloadUrl = options['livereload-url'] ? String(options['livereload-url']) : undefined;

      if (!livereloadUrl) {
        // TODO: use runner directly
        const details = await serve({ flags: this.env.flags, config: this.env.config, log: this.env.log, prompt: this.env.prompt, shell: this.env.shell, project: this.project }, inputs, generateOptionsForCordovaBuild(metadata, inputs, options));

        if (details.externallyAccessible === false && !options['native-run']) {
          const extra = LOCAL_ADDRESSES.includes(details.externalAddress) ? '\nEnsure you have proper port forwarding setup from your device to your computer.' : '';
          this.env.log.warn(`Your device or emulator may not be able to access ${chalk.bold(details.externalAddress)}.${extra}\n\n`);
        }

        livereloadUrl = `${details.protocol || 'http'}://${options['native-run'] ? details.localAddress : details.externalAddress}:${details.port}`;
      }

      const conf = await loadConfigXml(this.integration);

      onBeforeExit(async () => {
        conf.resetContentSrc();
        await conf.save();
      });

      conf.writeContentSrc(livereloadUrl);
      await conf.save();

      const cordovalog = this.env.log.clone();
      cordovalog.handlers = createDefaultLoggerHandlers(createPrefixedFormatter(`${chalk.dim(`[cordova]`)} `));
      const cordovalogws = cordovalog.createWriteStream(LOGGER_LEVELS.INFO);

      if (options['native-run']) {
        // hack to do just Cordova build instead
        metadata.name = 'build';

        const buildOpts: IShellRunOptions = { stream: cordovalogws };
        // ignore very verbose compiler output unless --verbose (still pipe stderr)
        if (!options['verbose']) {
          buildOpts.stdio = ['ignore', 'ignore', 'pipe'];
        }
        await this.runCordova(filterArgumentsForCordova(metadata, options), buildOpts);

        const platform = inputs[0];
        const packagePath = getPackagePath(conf.getProjectInfo().name, platform, options['emulator'] as boolean);
        const nativeRunArgs = createNativeRunArgs(packagePath, platform, livereloadUrl, options);
        await this.nativeRun(nativeRunArgs);
      } else {
        await this.runCordova(filterArgumentsForCordova(metadata, options), { stream: cordovalogws });
        await sleepForever();
      }
    } else {
      if (options.build) {
        // TODO: use runner directly
        await build({ config: this.env.config, log: this.env.log, shell: this.env.shell, prompt: this.env.prompt, project: this.project }, inputs, generateOptionsForCordovaBuild(metadata, inputs, options));
      }

      await this.runCordova(filterArgumentsForCordova(metadata, options));
    }
  }

  protected async nativeRun(args: ReadonlyArray<string>): Promise<void> {
    if (!this.project) {
      throw new FatalException(`Cannot run ${chalk.green('ionic cordova run/emulate')} outside a project directory.`);
    }

    let ws: NodeJS.WritableStream | undefined;

    if (!args.includes('--list')) {
      const log = this.env.log.clone();
      log.handlers = createDefaultLoggerHandlers(createPrefixedFormatter(chalk.dim(`[native-run]`)));
      ws = log.createWriteStream(LOGGER_LEVELS.INFO);
    }

    try {
      await this.env.shell.run('native-run', args, { showCommand: !args.includes('--json'), fatalOnNotFound: false, cwd: this.project.directory, stream: ws });
    } catch (e) {
      if (e instanceof ShellCommandError && e.code === ERROR_SHELL_COMMAND_NOT_FOUND) {
        const cdvInstallArgs = await pkgManagerArgs(this.env.config.get('npmClient'), { command: 'install', pkg: 'native-run', global: true });
        throw new FatalException(
          `${chalk.green('native-run')} was not found on your PATH. Please install it globally:\n` +
          `${chalk.green(cdvInstallArgs.join(' '))}\n`
        );
      }

      throw e;
    }

    // If we connect the `native-run` process to the running app, then we
    // should also connect the Ionic CLI with the running `native-run` process.
    // This will exit the Ionic CLI when `native-run` exits.
    if (args.includes('--connect')) {
      processExit(0); // tslint:disable-line:no-floating-promises
    }
  }
}

function createNativeRunArgs(packagePath: string, platform: string, livereloadUrl: string, options: CommandLineOptions): string[] {
  const opts = [platform, '--app', packagePath];
  const target = options['target'] ? String(options['target']) : undefined;

  if (target) {
    opts.push('--target', target);
  } else if (options['emulator']) {
    opts.push('--virtual');
  }

  if (options['connect']) {
    opts.push('--connect');
  }

  if (!options['livereload-url']) {
    const { port } = url.parse(livereloadUrl);
    opts.push('--forward', `${port}:${port}`);
  }

  if (options['json']) {
    opts.push('--json');
  }

  if (options['verbose']) {
    opts.push('--verbose');
  }

  return opts;
}

function createNativeRunListArgs(inputs: string[], options: CommandLineOptions): string[] {
  const args = [];
  if (inputs[0]) {
    args.push(inputs[0]);
  }
  args.push('--list');
  if (options['json']) {
    args.push('--json');
  }
  if (options['device']) {
    args.push('--device');
  }
  if (options['emulator']) {
    args.push('--virtual');
  }
  if (options['json']) {
    args.push('--json');
  }

  return args;
}

function getPackagePath(appName: string, platform: string, emulator: boolean) {
  if (platform === 'android') {
    // TODO: don't hardcode this/support multiple build paths (ex: multiple arch builds)
    // use app/build/outputs/apk/debug/output.json?
    return path.join(CORDOVA_ANDROID_PACKAGE_PATH, 'debug', 'app-debug.apk');
  }
  if (platform === 'ios' && emulator) {
    return path.join(CORDOVA_IOS_SIMULATOR_PACKAGE_PATH, `${appName}.app`);
  } else {
    return path.join(CORDOVA_IOS_DEVICE_PACKAGE_PATH, `${appName}.ipa`);
  }
}
