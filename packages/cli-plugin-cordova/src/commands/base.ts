import * as chalk from 'chalk';

import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandPreRun,
  ERROR_SHELL_COMMAND_NOT_FOUND,
  IShellRunOptions,
} from '@ionic/cli-utils';

import { getProjectPlugins, getProjectPlatforms, installPlatform, installPlugins } from '../lib/utils/setup';

export class CordovaCommand extends Command {
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
}

export class CordovaPlatformCommand extends CordovaCommand implements CommandPreRun {
  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [ runPlatform ] = inputs;

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
