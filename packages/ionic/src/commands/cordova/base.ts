import * as path from 'path';
import chalk from 'chalk';

import { fsMkdir, pathExists } from '@ionic/cli-framework/utils/fs';
import { prettyPath } from '@ionic/cli-framework/utils/format';

import { CommandMetadataOption, IShellRunOptions, OptionGroup } from '@ionic/cli-utils';

import { Command } from '@ionic/cli-utils/lib/command';
import { FatalException } from '@ionic/cli-utils/lib/errors';
import { checkCordova } from '@ionic/cli-utils/lib/integrations/cordova/utils';

export const COMMON_CORDOVA_BUILD_COMMAND_OPTIONS: CommandMetadataOption[] = [
  {
    name: 'debug',
    description: 'Create a debug build',
    type: Boolean,
    groups: [OptionGroup.Cordova],
    hint: 'cordova',
  },
  {
    name: 'release',
    description: 'Create a release build',
    type: Boolean,
    groups: [OptionGroup.Cordova],
    hint: 'cordova',
  },
  {
    name: 'device',
    description: 'Create a build for a device',
    type: Boolean,
    groups: [OptionGroup.Cordova],
    hint: 'cordova',
  },
  {
    name: 'emulator',
    description: 'Create a build for an emulator',
    type: Boolean,
    groups: [OptionGroup.Cordova],
    hint: 'cordova',
  },
  {
    name: 'buildConfig',
    description: 'Use the specified build configuration',
    groups: [OptionGroup.Advanced, OptionGroup.Cordova],
    hint: 'cordova',
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
