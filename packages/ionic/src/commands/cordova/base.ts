import { MetadataGroup } from '@ionic/cli-framework';
import { prettyPath } from '@ionic/cli-framework/utils/format';
import { mkdirp, pathExists } from '@ionic/utils-fs';
import { ERROR_COMMAND_NOT_FOUND, ERROR_SIGNAL_EXIT, SubprocessError } from '@ionic/utils-subprocess';
import * as path from 'path';

import { CommandInstanceInfo, CommandMetadataOption, IShellRunOptions, ProjectIntegration } from '../../definitions';
import { input, strong, weak } from '../../lib/color';
import { Command } from '../../lib/command';
import { FatalException } from '../../lib/errors';
import { runCommand } from '../../lib/executor';

export const CORDOVA_COMPILE_OPTIONS: CommandMetadataOption[] = [
  {
    name: 'debug',
    summary: 'Mark as a debug build',
    type: Boolean,
    groups: ['cordova', 'cordova-cli'],
    hint: weak('[cordova]'),
  },
  {
    name: 'release',
    summary: 'Mark as a release build',
    type: Boolean,
    groups: ['cordova', 'cordova-cli'],
    hint: weak('[cordova]'),
  },
  {
    name: 'device',
    summary: 'Deploy build to a device',
    type: Boolean,
    groups: ['cordova', 'cordova-cli', 'native-run'],
    hint: weak('[cordova/native-run]'),
  },
  {
    name: 'emulator',
    summary: 'Deploy build to an emulator',
    type: Boolean,
    groups: ['cordova', 'cordova-cli', 'native-run'],
    hint: weak('[cordova/native-run]'),
  },
  {
    name: 'buildConfig',
    summary: 'Use the specified build configuration',
    groups: [MetadataGroup.ADVANCED, 'cordova', 'cordova-cli'],
    hint: weak('[cordova]'),
    spec: { value: 'file' },
  },
];

export const CORDOVA_RUN_OPTIONS: ReadonlyArray<CommandMetadataOption> = [
  ...CORDOVA_COMPILE_OPTIONS,
  {
    name: 'target',
    summary: `Deploy build to a device (use ${input('--list')} to see all)`,
    type: String,
    groups: [MetadataGroup.ADVANCED, 'cordova', 'cordova-cli', 'native-run'],
    hint: weak('[cordova]'),
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
  private _integration?: Required<ProjectIntegration>;

  get integration(): Required<ProjectIntegration> {
    if (!this.project) {
      throw new FatalException(`Cannot use Cordova outside a project directory.`);
    }

    if (!this._integration) {
      this._integration = this.project.requireIntegration('cordova');
    }

    return this._integration;
  }

  async checkCordova(runinfo: CommandInstanceInfo) {
    if (!this.project) {
      throw new FatalException('Cannot use Cordova outside a project directory.');
    }

    const cordova = this.project.getIntegration('cordova');

    if (!cordova) {
      await runCommand(runinfo, ['integrations', 'enable', 'cordova']);
    }
  }

  async preRunChecks(runinfo: CommandInstanceInfo) {
    if (!this.project) {
      throw new FatalException('Cannot use Cordova outside a project directory.');
    }

    const { loadConfigXml } = await import('../../lib/integrations/cordova/config');

    await this.checkCordova(runinfo);

    // Check for www folder
    if (this.project.directory) {
      const wwwPath = path.join(this.integration.root, 'www');
      const wwwExists = await pathExists(wwwPath); // TODO: hard-coded

      if (!wwwExists) {
        const tasks = this.createTaskChain();

        tasks.next(`Creating ${strong(prettyPath(wwwPath))} directory for you`);
        await mkdirp(wwwPath);
        tasks.end();
      }
    }

    const conf = await loadConfigXml(this.integration);
    conf.resetContentSrc();
    await conf.save();
  }

  async runCordova(argList: string[], { fatalOnNotFound = false, truncateErrorOutput = 5000, ...options }: IShellRunOptions = {}): Promise<void> {
    if (!this.project) {
      throw new FatalException('Cannot use Cordova outside a project directory.');
    }

    const { pkgManagerArgs } = await import('../../lib/utils/npm');

    try {
      await this.env.shell.run('cordova', argList, { fatalOnNotFound, truncateErrorOutput, cwd: this.integration.root, ...options });
    } catch (e) {
      if (e instanceof SubprocessError) {
        if (e.code === ERROR_COMMAND_NOT_FOUND) {
          const cdvInstallArgs = await pkgManagerArgs(this.env.config.get('npmClient'), { command: 'install', pkg: 'cordova', global: true });
          throw new FatalException(
            `The Cordova CLI was not found on your PATH. Please install Cordova globally:\n` +
            `${input(cdvInstallArgs.join(' '))}\n`
          );
        }

        if (e.code === ERROR_SIGNAL_EXIT) {
          return;
        }
      }

      if (options.fatalOnError) {
        this.env.log.nl();
        this.env.log.error('Cordova encountered an error.\nYou may get more insight by running the Cordova command above directly.\n');
      }

      throw e;
    }
  }

  async checkForPlatformInstallation(platform: string, { promptToInstall = false, promptToInstallRefusalMsg = `Cannot run this command for the ${input(platform)} platform unless it is installed.` }: { promptToInstall?: boolean; promptToInstallRefusalMsg?: string; } = {}): Promise<void> {
    if (!this.project) {
      throw new FatalException('Cannot use Cordova outside a project directory.');
    }

    if (platform) {
      const { getPlatforms } = await import('../../lib/integrations/cordova/project');

      const platforms = await getPlatforms(this.integration.root);

      if (!platforms.includes(platform)) {
        const confirm = promptToInstall ? await this.env.prompt({
          message: `Platform ${input(platform)} is not installed! Would you like to install it?`,
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
