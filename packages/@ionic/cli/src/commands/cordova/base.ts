import { MetadataGroup } from '@ionic/cli-framework';
import { prettyPath } from '@ionic/cli-framework/utils/format';
import { mkdirp, pathExists } from '@ionic/utils-fs';
import { ERROR_COMMAND_NOT_FOUND, ERROR_SIGNAL_EXIT, SubprocessError } from '@ionic/utils-subprocess';
import * as lodash from 'lodash';
import * as path from 'path';

import { CommandInstanceInfo, CommandMetadataOption, IShellRunOptions, ProjectIntegration } from '../../definitions';
import { input, strong, weak } from '../../lib/color';
import { Command } from '../../lib/command';
import { FatalException } from '../../lib/errors';
import { getFullCommandParts, runCommand } from '../../lib/executor';
import { pkgManagerArgs } from '../../lib/utils/npm';

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

export const CORDOVA_RUN_OPTIONS: readonly CommandMetadataOption[] = [
  ...CORDOVA_COMPILE_OPTIONS,
  {
    name: 'target',
    summary: `Deploy build to a device (use ${input('--list')} to see all)`,
    type: String,
    groups: [MetadataGroup.ADVANCED, 'cordova', 'cordova-cli', 'native-run'],
    hint: weak('[cordova/native-run]'),
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

  protected get integration(): Required<ProjectIntegration> {
    if (!this.project) {
      throw new FatalException(`Cannot use Cordova outside a project directory.`);
    }

    if (!this._integration) {
      this._integration = this.project.requireIntegration('cordova');
    }

    return this._integration;
  }

  protected async checkCordova(runinfo: CommandInstanceInfo) {
    if (!this.project) {
      throw new FatalException('Cannot use Cordova outside a project directory.');
    }

    const cordova = this.project.getIntegration('cordova');

    if (!cordova) {
      const { confirmCordovaUsage } = await import('../../lib/integrations/cordova/utils');
      const confirm = await confirmCordovaUsage(this.env);

      if (!confirm) {
        throw new FatalException('', 0);
      }

      await runCommand(runinfo, ['integrations', 'enable', 'cordova']);
    }
  }

  protected async preRunChecks(runinfo: CommandInstanceInfo): Promise<void> {
    const { checkForUnsupportedProject } = await import('../../lib/integrations/cordova/utils');
    const { loadCordovaConfig } = await import('../../lib/integrations/cordova/config');

    if (!this.project) {
      throw new FatalException('Cannot use Cordova outside a project directory.');
    }

    const parts = getFullCommandParts(runinfo.location);
    const alias = lodash.last(parts);

    await checkForUnsupportedProject(this.project.type, alias);
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

    const conf = await loadCordovaConfig(this.integration);
    conf.resetContentSrc();
    await conf.save();
  }

  protected async runCordova(argList: string[], { fatalOnNotFound = false, truncateErrorOutput = 5000, ...options }: IShellRunOptions = {}): Promise<void> {
    if (!this.project) {
      throw new FatalException('Cannot use Cordova outside a project directory.');
    }

    try {
      await this.env.shell.run('cordova', argList, { fatalOnNotFound, truncateErrorOutput, cwd: this.integration.root, ...options });
    } catch (e) {
      if (e instanceof SubprocessError) {
        if (e.code === ERROR_COMMAND_NOT_FOUND) {
          const installArgs = await pkgManagerArgs(this.env.config.get('npmClient'), { command: 'install', pkg: 'cordova', global: true });
          throw new FatalException(
            `The Cordova CLI was not found on your PATH. Please install Cordova globally:\n` +
            `${input(installArgs.join(' '))}\n`
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

  protected async checkForPlatformInstallation(platform: string, { promptToInstall = !['android', 'ios'].includes(platform), promptToInstallRefusalMsg = `Cannot run this command for the ${input(platform)} platform unless it is installed.` }: { promptToInstall?: boolean; promptToInstallRefusalMsg?: string; } = {}): Promise<void> {
    if (!this.project) {
      throw new FatalException('Cannot use Cordova outside a project directory.');
    }

    if (platform) {
      const { getPlatforms } = await import('../../lib/integrations/cordova/project');
      const { confirmCordovaBrowserUsage } = await import('../../lib/integrations/cordova/utils');

      const platforms = await getPlatforms(this.integration.root);

      if (!platforms.includes(platform)) {
        if (platform === 'browser') {
          const confirm = await confirmCordovaBrowserUsage(this.env);

          if (!confirm) {
            throw new FatalException(promptToInstallRefusalMsg);
          }
        }

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
