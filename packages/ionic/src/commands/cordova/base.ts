import { ERROR_SHELL_COMMAND_NOT_FOUND, OptionGroup, ShellCommandError } from '@ionic/cli-framework';
import { prettyPath } from '@ionic/cli-framework/utils/format';
import { mkdirp, pathExists } from '@ionic/utils-fs';
import chalk from 'chalk';
import * as path from 'path';

import { CommandInstanceInfo, CommandMetadataOption, IShellRunOptions } from '../../definitions';
import { Command } from '../../lib/command';
import { FatalException } from '../../lib/errors';
import { runCommand } from '../../lib/executor';

export const COMMON_CORDOVA_BUILD_COMMAND_OPTIONS: CommandMetadataOption[] = [
  {
    name: 'debug',
    summary: 'Create a debug build',
    type: Boolean,
    groups: ['cordova'],
    hint: chalk.dim('[cordova]'),
  },
  {
    name: 'release',
    summary: 'Create a release build',
    type: Boolean,
    groups: ['cordova'],
    hint: chalk.dim('[cordova]'),
  },
  {
    name: 'device',
    summary: 'Create a build for a device',
    type: Boolean,
    groups: ['cordova'],
    hint: chalk.dim('[cordova]'),
  },
  {
    name: 'emulator',
    summary: 'Create a build for an emulator',
    type: Boolean,
    groups: ['cordova'],
    hint: chalk.dim('[cordova]'),
  },
  {
    name: 'buildConfig',
    summary: 'Use the specified build configuration',
    groups: [OptionGroup.Advanced, 'cordova'],
    hint: chalk.dim('[cordova]'),
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
  async checkCordova(runinfo: CommandInstanceInfo) {
    if (!this.project) {
      throw new FatalException('Cannot use Cordova outside a project directory.');
    }

    const integration = this.project.config.get('integrations').cordova;

    if (integration && integration.enabled === false) {
      return;
    }

    if (!integration) {
      await runCommand(runinfo, ['integrations', 'enable', 'cordova']);
    }
  }

  async preRunChecks(runinfo: CommandInstanceInfo) {
    if (!this.project) {
      throw new FatalException('Cannot use Cordova outside a project directory.');
    }

    const { loadConfigXml } = await import('../../lib/integrations/cordova/config');

    await this.checkCordova(runinfo);

    const cordova = await this.project.getIntegration('cordova');

    // Check for www folder
    if (this.project.directory) {
      const wwwPath = path.join(cordova.root, 'www');
      const wwwExists = await pathExists(wwwPath); // TODO: hard-coded

      if (!wwwExists) {
        const tasks = this.createTaskChain();

        tasks.next(`Creating ${chalk.bold(prettyPath(wwwPath))} directory for you`);
        await mkdirp(wwwPath, 0o777);
        tasks.end();
      }
    }

    const conf = await loadConfigXml({ project: this.project });
    conf.resetContentSrc();
    await conf.save();
  }

  async runCordova(argList: string[], { fatalOnNotFound = false, truncateErrorOutput = 5000, ...options }: IShellRunOptions = {}): Promise<void> {
    if (!this.project) {
      throw new FatalException('Cannot use Cordova outside a project directory.');
    }

    const { pkgManagerArgs } = await import('../../lib/utils/npm');
    const { root: cwd } = await this.project.getIntegration('cordova');

    try {
      await this.env.shell.run('cordova', argList, { fatalOnNotFound, truncateErrorOutput, cwd, ...options });
    } catch (e) {
      if (e instanceof ShellCommandError && e.code === ERROR_SHELL_COMMAND_NOT_FOUND) {
        const cdvInstallArgs = await pkgManagerArgs(this.env.config.get('npmClient'), { command: 'install', pkg: 'cordova', global: true });
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

  async checkForPlatformInstallation(platform: string, { promptToInstall = false, promptToInstallRefusalMsg = `Cannot run this command for the ${chalk.green(platform)} platform unless it is installed.` }: { promptToInstall?: boolean; promptToInstallRefusalMsg?: string; } = {}): Promise<void> {
    if (!this.project) {
      throw new FatalException('Cannot use Cordova outside a project directory.');
    }

    if (platform) {
      const { getPlatforms } = await import('../../lib/integrations/cordova/project');

      const cordova = await this.project.getIntegration('cordova');
      const platforms = await getPlatforms(cordova.root);

      if (!platforms.includes(platform)) {
        const confirm = promptToInstall ? await this.env.prompt({
          message: `Platform ${chalk.green(platform)} is not installed! Would you like to install it?`,
          type: 'confirm',
          name: 'confirm',
        }) : true;

        if (confirm) {
          await this.runCordova(['platform', 'add', platform, '--save']);
        } else {
          throw new FatalException(promptToInstallRefusalMsg);
        }
      }
    }
  }
}
