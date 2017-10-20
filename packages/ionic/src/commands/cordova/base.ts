import * as path from 'path';
import chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, CommandOption, CommandPreRun, IShellRunOptions } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';
import { FatalException } from '@ionic/cli-utils/lib/errors';
import { fsMkdir, pathExists } from '@ionic/cli-framework/utils/fs';
import { BIND_ALL_ADDRESS, DEFAULT_DEV_LOGGER_PORT, DEFAULT_LIVERELOAD_PORT, DEFAULT_SERVER_PORT, LOCAL_ADDRESSES } from '@ionic/cli-utils/lib/serve';
import { APP_SCRIPTS_OPTIONS } from '@ionic/cli-utils/lib/ionic-angular/app-scripts';
import { CORDOVA_INTENT, checkCordova, filterArgumentsForCordova, generateBuildOptions } from '@ionic/cli-utils/lib/cordova/utils';

export const CORDOVA_RUN_COMMAND_OPTIONS: CommandOption[] = [
  {
    name: 'list',
    description: 'List all available Cordova targets',
    type: Boolean,
    intents: [CORDOVA_INTENT],
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
    visible: false,
  },
  {
    name: 'address',
    description: 'Use specific address for the dev server',
    default: BIND_ALL_ADDRESS,
    advanced: true,
  },
  {
    name: 'port',
    description: 'Use specific port for HTTP',
    default: String(DEFAULT_SERVER_PORT),
    aliases: ['p'],
    advanced: true,
  },
  {
    name: 'livereload-port',
    description: 'Use specific port for live-reload',
    default: String(DEFAULT_LIVERELOAD_PORT),
    aliases: ['r'],
    advanced: true,
  },
  {
    name: 'dev-logger-port',
    description: 'Use specific port for dev server communication',
    default: String(DEFAULT_DEV_LOGGER_PORT),
    advanced: true,
  },
  ...APP_SCRIPTS_OPTIONS,
  {
    name: 'debug',
    description: 'Mark as a debug build',
    type: Boolean,
    intents: [CORDOVA_INTENT],
  },
  {
    name: 'release',
    description: 'Mark as a release build',
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
    name: 'target',
    description: `Deploy Cordova build to a device (use ${chalk.green('--list')} to see all)`,
    type: String,
    intents: [CORDOVA_INTENT],
  },
  {
    name: 'buildConfig',
    description: 'Use the specified Cordova build configuration',
    intents: [CORDOVA_INTENT],
    advanced: true,
  },
];

export abstract class CordovaCommand extends Command {
  async preRunChecks() {
    const { ConfigXml } = await import('@ionic/cli-utils/lib/cordova/config');
    const { prettyPath } = await import('@ionic/cli-utils/lib/utils/format');

    await checkCordova(this.env);

    // Check for www folder
    if (this.env.project.directory) {
      const wwwPath = path.join(this.env.project.directory, 'www');
      const wwwExists = await pathExists(wwwPath); // TODO: hard-coded

      if (!wwwExists) {
        this.env.tasks.next(`Creating ${chalk.bold(prettyPath(wwwPath))} directory for you`);
        await fsMkdir(wwwPath, undefined);
        this.env.tasks.end();
      }
    }

    const conf = await ConfigXml.load(this.env.project.directory);
    conf.resetContentSrc();
    await conf.save();
  }

  async runCordova(argList: string[], { fatalOnNotFound = false, truncateErrorOutput = 5000, ...options }: IShellRunOptions = {}): Promise<string> {
    const { ERROR_SHELL_COMMAND_NOT_FOUND } = await import('@ionic/cli-utils/lib/shell');
    const { pkgManagerArgs } = await import('@ionic/cli-utils/lib/utils/npm');

    try {
      return await this.env.shell.run('cordova', argList, { fatalOnNotFound, truncateErrorOutput, ...options });
    } catch (e) {
      if (e === ERROR_SHELL_COMMAND_NOT_FOUND) {
        const cdvInstallArgs = await pkgManagerArgs(this.env, { pkg: 'cordova', global: true });
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
      const { getPlatforms, installPlatform } = await import('@ionic/cli-utils/lib/cordova/project');
      const platforms = await getPlatforms(this.env.project.directory);

      if (!platforms.includes(runPlatform)) {
        await installPlatform(this.env, runPlatform);
      }
    }
  }
}

export class CordovaRunCommand extends CordovaCommand implements CommandPreRun {
  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    await this.preRunChecks();

    if (options['list']) {
      const args = filterArgumentsForCordova(this.metadata, inputs, options);
      if (!options['device'] && !options['emulator']) {
        if (args[0] === 'run') {
          args.push('--device');
        } else if (args[0] === 'emulate') {
          args.push('--emulator');
        }
      }
      args[0] = 'run';
      await this.runCordova(args, { showExecution: true });
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
    const { ConfigXml } = await import('@ionic/cli-utils/lib/cordova/config');
    const { registerShutdownFunction } = await import('@ionic/cli-utils/lib/process');

    if (!options['livereload'] && (options['consolelogs'] || options['serverlogs'])) {
      this.env.log.info(`${chalk.green('--consolelogs')} or ${chalk.green('--serverlogs')} detected, using ${chalk.green('--livereload')}`);
      options['livereload'] = true;
    }

    const isLiveReload = options['livereload'];

    const conf = await ConfigXml.load(this.env.project.directory);

    registerShutdownFunction(this.env, () => {
      conf.resetContentSrc();
      conf.saveSync();
    });

    if (isLiveReload) {
      const { serve } = await import('@ionic/cli-utils/commands/serve');
      const serverDetails = await serve(this.env, inputs, generateBuildOptions(this.metadata, options));

      if (serverDetails.externallyAccessible === false) {
        const extra = LOCAL_ADDRESSES.includes(serverDetails.externalAddress) ? '\nEnsure you have proper port forwarding setup from your device to your computer.' : '';
        this.env.log.warn(`Your device or emulator may not be able to access ${chalk.bold(serverDetails.externalAddress)}.${extra}\n\n`);
      }

      conf.writeContentSrc(`${serverDetails.protocol || 'http'}://${serverDetails.externalAddress}:${serverDetails.port}`);
      await conf.save();
    } else {
      const { build } = await import('@ionic/cli-utils/commands/build');
      await build(this.env, inputs, generateBuildOptions(this.metadata, options));
    }

    await this.runCordova(filterArgumentsForCordova(this.metadata, inputs, options), { showExecution: true });

    if (!isLiveReload) {
      this.env.log.ok(
        `Your app has been deployed.\n` +
        `Did you know you can live-reload changes from your app with ${chalk.green('--livereload')}?`
      );
    }
  }
}
