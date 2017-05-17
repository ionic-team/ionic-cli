import * as path from 'path';
import * as chalk from 'chalk';

import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandPreRun,
  ERROR_SHELL_COMMAND_NOT_FOUND,
  IShellRunOptions,
  fsMkdir,
  pathExists,
  prettyPath,
} from '@ionic/cli-utils';

import { generateBuildOptions, filterArgumentsForCordova, CORDOVA_INTENT } from '../lib/utils/cordova';
import { resetConfigXmlContentSrc, writeConfigXmlContentSrc } from '../lib/utils/configXmlUtils';
import { getProjectPlugins, getProjectPlatforms, installPlatform, installPlugins } from '../lib/utils/setup';

export const CORDOVA_RUN_COMMAND_OPTIONS = [
  {
    name: 'list',
    description: 'List all available Cordova targets',
    type: Boolean,
    intent: CORDOVA_INTENT,
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
    intent: CORDOVA_INTENT,
  },
  {
    name: 'release',
    description: 'Mark as a release build',
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
    name: 'target',
    description: `Deploy Cordova build to a device (use ${chalk.green('--list')} to see all)`,
    type: String,
    intent: CORDOVA_INTENT,
  },
  {
    name: 'buildConfig',
    description: 'Use the specified Cordova build configuration',
    intent: CORDOVA_INTENT,
  },
];

export class CordovaCommand extends Command {
  async checkForAssetsFolder(): Promise<void> {
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
    try {
      return await this.env.shell.run('cordova', argList, { fatalOnNotFound, truncateErrorOutput, ...options });
    } catch (e) {
      if (e === ERROR_SHELL_COMMAND_NOT_FOUND) {
        throw this.exit(`The Cordova CLI was not found on your PATH. Please install Cordova globally:\n\n` +
                        `${chalk.green('npm install -g cordova')}\n`);
      }

      this.env.log.nl();
      this.env.log.error('Cordova encountered an error.\nYou may get more insight by running the Cordova command above directly.\n');

      throw e;
    }
  }

  async checkForPlatformInstallation(runPlatform: string) {
    if (runPlatform) {
      const [ platforms, plugins ] = await Promise.all([
        getProjectPlatforms(this.env.project.directory),
        getProjectPlugins(this.env.project.directory),
      ]);

      if (!platforms.includes(runPlatform)) {
        await installPlatform(this.env, runPlatform);
      }

      if (plugins.length === 0) {
        await installPlugins(this.env);
      }
    }
  }
}

export class CordovaRunCommand extends CordovaCommand implements CommandPreRun {
  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {
    await this.checkForAssetsFolder();

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
      const response = await this.env.prompt({
        type: 'input',
        name: 'platform',
        message: `What platform would you like to run: ${chalk.green('ios')}, ${chalk.green('android')}:`,
      });

      inputs[0] = response['platform'].trim();
    }

    await this.checkForPlatformInstallation(inputs[0]);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const isLiveReload = options['livereload'];

    // If it is not livereload then just run build.
    if (!isLiveReload) {

      // ensure the content node was set back to its original
      await resetConfigXmlContentSrc(this.env.project.directory);
      await this.env.hooks.fire('command:build', {
        cmd: this,
        env: this.env,
        inputs,
        options: generateBuildOptions(this.metadata, options),
      });
    } else {
      const serverSettings = (await this.env.hooks.fire('command:serve', {
        cmd: this,
        env: this.env,
        inputs,
        options: generateBuildOptions(this.metadata, options),
      }))[0];

      await writeConfigXmlContentSrc(this.env.project.directory, `http://${serverSettings.publicIp}:${serverSettings.httpPort}`);
    }

    await this.runCordova(filterArgumentsForCordova(this.metadata, inputs, options), { showExecution: true });
  }
}
