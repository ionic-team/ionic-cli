import * as path from 'path';
import * as chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, CommandPreRun, IShellRunOptions } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';
import { fsMkdir, pathExists } from '@ionic/cli-utils/lib/utils/fs';

export const CORDOVA_RUN_COMMAND_OPTIONS = [
  {
    name: 'list',
    description: 'List all available Cordova targets',
    type: Boolean,
    intent: 'CORDOVA',
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
  },
  {
    name: 'address',
    description: 'Use specific address for dev/live-reload server',
    default: '0.0.0.0',
  },
  {
    name: 'port',
    description: 'Use specific port for the dev server',
    default: '8100',
    aliases: ['p'],
  },
  {
    name: 'livereload-port',
    description: 'Use specific port for live-reload server',
    default: '35729',
    aliases: ['r'],
  },
  {
    name: 'prod',
    description: 'Mark as a production build',
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
  {
    name: 'debug',
    description: 'Mark as a debug build',
    type: Boolean,
    intent: 'CORDOVA',
  },
  {
    name: 'release',
    description: 'Mark as a release build',
    type: Boolean,
    intent: 'CORDOVA',
  },
  {
    name: 'device',
    description: 'Deploy Cordova build to a device',
    type: Boolean,
    intent: 'CORDOVA',
  },
  {
    name: 'emulator',
    description: 'Deploy Cordova build to an emulator',
    type: Boolean,
    intent: 'CORDOVA',
  },
  {
    name: 'target',
    description: `Deploy Cordova build to a device (use ${chalk.green('--list')} to see all)`,
    type: String,
    intent: 'CORDOVA',
  },
  {
    name: 'buildConfig',
    description: 'Use the specified Cordova build configuration',
    intent: 'CORDOVA',
  },
];

export class CordovaCommand extends Command {
  async preRunChecks() {
    const { prettyPath } = await import('@ionic/cli-utils/lib/utils/format');

    const project = await this.env.project.load();

    if (!project.integrations.cordova) {
      this.env.log.info('Enabling Cordova integration.');
      await this.runcmd(['config', 'set', 'integrations.cordova', '{}', '--json', '--force']);
    }

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
  }

  async runCordova(argList: string[], { fatalOnNotFound = false, truncateErrorOutput = 5000, ...options }: IShellRunOptions = {}): Promise<string> {
    const { ERROR_SHELL_COMMAND_NOT_FOUND } = await import('@ionic/cli-utils/lib/shell');
    const { pkgManagerArgs } = await import('@ionic/cli-utils/lib/utils/npm');

    try {
      return await this.env.shell.run('cordova', argList, { fatalOnNotFound, truncateErrorOutput, ...options });
    } catch (e) {
      if (e === ERROR_SHELL_COMMAND_NOT_FOUND) {
        const cdvInstallArgs = await pkgManagerArgs(this.env, { pkg: 'cordova', global: true });
        throw this.exit(
          `The Cordova CLI was not found on your PATH. Please install Cordova globally:\n\n` +
          `${chalk.green(cdvInstallArgs.join(' '))}\n`
        );
      }

      this.env.log.nl();
      this.env.log.error('Cordova encountered an error.\nYou may get more insight by running the Cordova command above directly.\n');

      throw e;
    }
  }

  async checkForPlatformInstallation(runPlatform: string) {
    const { getProjectPlatforms, installPlatform } = await import('@ionic/cli-utils/lib/cordova/project');

    if (runPlatform) {
      const platforms = await getProjectPlatforms(this.env.project.directory);

      if (!platforms.includes(runPlatform)) {
        await installPlatform(this.env, runPlatform);
      }
    }
  }
}

export class CordovaRunCommand extends CordovaCommand implements CommandPreRun {
  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {
    const { filterArgumentsForCordova } = await import('@ionic/cli-utils/lib/cordova/utils');

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
      return 0;
    }

    if (!inputs[0]) {
      const platform = await this.env.prompt({
        type: 'input',
        name: 'platform',
        message: `What platform would you like to run: ${chalk.green('ios')}, ${chalk.green('android')}:`,
      });

      inputs[0] = platform.trim();
    }

    await this.checkForPlatformInstallation(inputs[0]);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { ConfigXml } = await import('@ionic/cli-utils/lib/cordova/config');
    const { filterArgumentsForCordova, generateBuildOptions } = await import('@ionic/cli-utils/lib/cordova/utils');

    const isLiveReload = options['livereload'];

    const conf = await ConfigXml.load(this.env.project.directory);
    await conf.resetContentSrc();
    await conf.save();

    if (isLiveReload) {
      const { serve } = await import('@ionic/cli-utils/commands/serve');
      const serverSettings = await serve(this.env, inputs, generateBuildOptions(this.metadata, options));

      if (serverSettings.externallyAccessible === false) {
        this.env.log.warn(
          `Your device or emulator may not be able to access ${chalk.bold(serverSettings.externalAddress)}.\n` +
          `Ensure you have proper port forwarding setup from your device to your computer.`
        );
      }

      await conf.writeContentSrc(`${serverSettings.protocol || 'http'}://${serverSettings.externalAddress}:${serverSettings.port}`);
      await conf.save();
    } else {
      const { build } = await import('@ionic/cli-utils/commands/build');
      await build(this.env, inputs, generateBuildOptions(this.metadata, options));
    }

    await this.runCordova(filterArgumentsForCordova(this.metadata, inputs, options), { showExecution: true });
  }
}
