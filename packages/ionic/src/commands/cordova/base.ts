import * as path from 'path';
import chalk from 'chalk';

import { fsMkdir, pathExists } from '@ionic/cli-framework/utils/fs';
import { prettyPath } from '@ionic/cli-framework/utils/format';

import { CommandLineInputs, CommandLineOptions, CommandMetadataOption, CommandPreRun, IShellRunOptions, OptionGroup } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';
import { FatalException } from '@ionic/cli-utils/lib/errors';
import { BIND_ALL_ADDRESS, DEFAULT_DEV_LOGGER_PORT, DEFAULT_LIVERELOAD_PORT, DEFAULT_SERVER_PORT, LOCAL_ADDRESSES } from '@ionic/cli-utils/lib/serve';
import { APP_SCRIPTS_OPTIONS } from '@ionic/cli-utils/lib/project/ionic-angular/app-scripts';
import { checkCordova, filterArgumentsForCordova, generateBuildOptions } from '@ionic/cli-utils/lib/integrations/cordova/utils';

export const CORDOVA_RUN_COMMAND_OPTIONS: CommandMetadataOption[] = [
  {
    name: 'list',
    description: 'List all available Cordova targets',
    type: Boolean,
    groups: [OptionGroup.Cordova],
  },
  {
    name: 'livereload',
    description: 'Spin up server to live-reload www files',
    type: Boolean,
    aliases: ['l'],
  },
  {
    name: 'consolelogs',
    description: 'Print out console logs to terminal',
    type: Boolean,
    aliases: ['c'],
  },
  {
    name: 'serverlogs',
    description: 'Print out dev server logs to terminal',
    type: Boolean,
    aliases: ['s'],
    groups: [OptionGroup.Deprecated, OptionGroup.Hidden],
  },
  {
    name: 'address',
    description: 'Use specific address for the dev server',
    default: BIND_ALL_ADDRESS,
    groups: [OptionGroup.Advanced],
  },
  {
    name: 'port',
    description: 'Use specific port for HTTP',
    default: String(DEFAULT_SERVER_PORT),
    aliases: ['p'],
    groups: [OptionGroup.Advanced],
  },
  {
    name: 'livereload-port',
    description: 'Use specific port for live-reload',
    default: String(DEFAULT_LIVERELOAD_PORT),
    aliases: ['r'],
    groups: [OptionGroup.Advanced],
  },
  {
    name: 'dev-logger-port',
    description: 'Use specific port for dev server communication',
    default: String(DEFAULT_DEV_LOGGER_PORT),
    groups: [OptionGroup.Advanced],
  },
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
    description: 'Mark as a debug build',
    type: Boolean,
    groups: [OptionGroup.Cordova],
  },
  {
    name: 'release',
    description: 'Mark as a release build',
    type: Boolean,
    groups: [OptionGroup.Cordova],
  },
  {
    name: 'device',
    description: 'Deploy Cordova build to a device',
    type: Boolean,
    groups: [OptionGroup.Cordova],
  },
  {
    name: 'emulator',
    description: 'Deploy Cordova build to an emulator',
    type: Boolean,
    groups: [OptionGroup.Cordova],
  },
  {
    name: 'target',
    description: `Deploy Cordova build to a device (use ${chalk.green('--list')} to see all)`,
    type: String,
    groups: [OptionGroup.Cordova],
  },
  {
    name: 'buildConfig',
    description: 'Use the specified Cordova build configuration',
    groups: [OptionGroup.Advanced, OptionGroup.Cordova],
  },
];

export const CORDOVA_BUILD_EXAMPLE_COMMANDS = [
  'ios',
  'ios --prod --release',
  'ios --prod --release -- --developmentTeam="ABCD" --codeSignIdentity="iPhone Developer" --packageType="app-store"',
  'ios --buildConfig=build.json',
  'ios --prod --release --buildConfig=build.json',
  'android',
  'android --prod --release -- -- --keystore=filename.keystore --alias=myalias',
  'android --prod --release -- -- --minSdkVersion=21',
  'android --prod --release -- -- --versionCode=55',
  'android --prod --release -- -- --gradleArg=-PcdvBuildMultipleApks=true',
  'android --buildConfig=build.json',
  'android --prod --release --buildConfig=build.json',
];

export abstract class CordovaCommand extends Command {
  async preRunChecks() {
    const { ConfigXml } = await import('@ionic/cli-utils/lib/integrations/cordova/config');

    await checkCordova(this.env);

    // Check for www folder
    if (this.env.project.directory) {
      const wwwPath = path.join(this.env.project.directory, 'www');
      const wwwExists = await pathExists(wwwPath); // TODO: hard-coded

      if (!wwwExists) {
        this.env.tasks.next(`Creating ${chalk.bold(prettyPath(wwwPath))} directory for you`);
        await fsMkdir(wwwPath, 0o777);
        this.env.tasks.end();
      }
    }

    const conf = await ConfigXml.load(this.env.project.directory);
    conf.resetContentSrc();
    await conf.save();
  }

  async runCordova(argList: string[], { fatalOnNotFound = false, truncateErrorOutput = 5000, ...options }: IShellRunOptions = {}): Promise<void> {
    const { ERROR_SHELL_COMMAND_NOT_FOUND } = await import('@ionic/cli-utils/lib/shell');
    const { pkgManagerArgs } = await import('@ionic/cli-utils/lib/utils/npm');
    const config = await this.env.config.load();
    const { npmClient } = config;

    try {
      await this.env.shell.run('cordova', argList, { fatalOnNotFound, truncateErrorOutput, ...options });
    } catch (e) {
      if (e === ERROR_SHELL_COMMAND_NOT_FOUND) {
        const cdvInstallArgs = await pkgManagerArgs({ npmClient, shell: this.env.shell }, { command: 'install', pkg: 'cordova', global: true });
        throw new FatalException(
          `The Cordova CLI was not found on your PATH. Please install Cordova globally:\n` +
          `${chalk.green(cdvInstallArgs.join(' '))}\n`
        );
      }

      if (options.fatalOnError) {
        this.env.log.nl();
        this.env.log.error('Cordova encountered an error.\nYou may get more insight by running the Cordova command above directly.\n');
      }

      throw e;
    }
  }

  async checkForPlatformInstallation(runPlatform: string) {
    if (runPlatform) {
      const { getPlatforms, installPlatform } = await import('@ionic/cli-utils/lib/integrations/cordova/project');
      const platforms = await getPlatforms(this.env.project.directory);

      if (!platforms.includes(runPlatform)) {
        await installPlatform(this.env, runPlatform);
      }
    }
  }
}

export abstract class CordovaRunCommand extends CordovaCommand implements CommandPreRun {
  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    await this.preRunChecks();

    if (options['list']) {
      const metadata = await this.getMetadata();
      const args = filterArgumentsForCordova(metadata, options);
      if (!options['device'] && !options['emulator']) {
        if (args[0] === 'run') {
          args.push('--device');
        } else if (args[0] === 'emulate') {
          args.push('--emulator');
        }
      }
      args[0] = 'run';
      await this.runCordova(args, {});
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

    if (!options['livereload'] && (options['consolelogs'] || options['serverlogs'])) {
      this.env.log.msg(`${chalk.green('--consolelogs')} or ${chalk.green('--serverlogs')} detected, using ${chalk.green('--livereload')}`);
      options['livereload'] = true;
    }

    const isLiveReload = options['livereload'];

    const conf = await ConfigXml.load(this.env.project.directory);

    registerShutdownFunction(() => {
      conf.resetContentSrc();
      conf.saveSync();
    });

    const metadata = await this.getMetadata();

    if (isLiveReload) {
      const { serve } = await import('@ionic/cli-utils/lib/serve');
      const details = await serve(this.env, inputs, generateBuildOptions(metadata, options));

      if (details.externallyAccessible === false) {
        const extra = LOCAL_ADDRESSES.includes(details.externalAddress) ? '\nEnsure you have proper port forwarding setup from your device to your computer.' : '';
        this.env.log.warn(`Your device or emulator may not be able to access ${chalk.bold(details.externalAddress)}.${extra}\n\n`);
      }

      conf.writeContentSrc(`${details.protocol || 'http'}://${details.externalAddress}:${details.port}`);
      await conf.save();
    } else {
      if (options.build) {
        const { build } = await import('@ionic/cli-utils/lib/build');
        await build(this.env, inputs, generateBuildOptions(metadata, options));
      }
    }

    await this.runCordova(filterArgumentsForCordova(metadata, options), {});

    if (!isLiveReload) {
      this.env.log.ok(
        `Your app has been deployed.\n` +
        `Did you know you can live-reload changes from your app with ${chalk.green('--livereload')}?`
      );
    }
  }
}
