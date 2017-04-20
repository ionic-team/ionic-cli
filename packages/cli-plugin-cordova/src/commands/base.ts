import * as os from 'os';

import * as chalk from 'chalk';

import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandPreRun,
  ERROR_SHELL_COMMAND_NOT_FOUND,
} from '@ionic/cli-utils';

import { arePluginsInstalled, getProjectPlatforms, installPlatform, installPlugins } from '../lib/utils/setup';

export class CordovaCommand extends Command {
  checkForMac(platform: string) {
    if (platform === 'ios' && os.platform() !== 'darwin') {
      throw this.exit('You cannot use Cordova for iOS unless you are on macOS.');
    }
  }

  async runCordova(optionList: string[]): Promise<string> {
    try {
      return await this.env.shell.run('cordova', optionList, {
        fatalOnNotFound: false,
        truncateErrorOutput: 5000,
      });
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
      this.checkForMac(runPlatform);

      const [ platforms, areInstalled ] = await Promise.all([
        getProjectPlatforms(this.env.project.directory),
        arePluginsInstalled(this.env.project.directory),
      ]);

      if (!platforms.includes(runPlatform)) {
        await installPlatform(runPlatform);
      }

      if (!areInstalled) {
        await installPlugins();
      }
    }
  }
}
