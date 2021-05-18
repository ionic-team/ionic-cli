import { pathExists } from '@ionic/utils-fs';
import { onBeforeExit } from '@ionic/utils-process';
import { ERROR_COMMAND_NOT_FOUND, SubprocessError } from '@ionic/utils-subprocess';
import * as lodash from 'lodash';
import * as path from 'path';
import * as semver from 'semver';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, IonicCapacitorOptions, ProjectIntegration } from '../../definitions';
import { input, weak } from '../../lib/color';
import { Command } from '../../lib/command';
import { FatalException, RunnerException } from '../../lib/errors';
import { runCommand } from '../../lib/executor';
import type { CapacitorCLIConfig, Integration as CapacitorIntegration } from '../../lib/integrations/capacitor'
import { ANDROID_MANIFEST_FILE, CapacitorAndroidManifest } from '../../lib/integrations/capacitor/android';
import { CAPACITOR_CONFIG_JSON_FILE, CapacitorJSONConfig, CapacitorConfig } from '../../lib/integrations/capacitor/config';
import { generateOptionsForCapacitorBuild } from '../../lib/integrations/capacitor/utils';
import { createPrefixedWriteStream } from '../../lib/utils/logger';
import { pkgManagerArgs } from '../../lib/utils/npm';

export abstract class CapacitorCommand extends Command {
  private _integration?: Required<ProjectIntegration>;

  get integration(): Required<ProjectIntegration> {
    if (!this.project) {
      throw new FatalException(`Cannot use Capacitor outside a project directory.`);
    }

    if (!this._integration) {
      this._integration = this.project.requireIntegration('capacitor');
    }

    return this._integration;
  }

  async getGeneratedConfig(platform: string): Promise<CapacitorJSONConfig> {
    if (!this.project) {
      throw new FatalException(`Cannot use Capacitor outside a project directory.`);
    }

    const p = await this.getGeneratedConfigPath(platform);

    return new CapacitorJSONConfig(p);
  }

  async getGeneratedConfigPath(platform: string): Promise<string> {
    if (!this.project) {
      throw new FatalException(`Cannot use Capacitor outside a project directory.`);
    }

    const p = await this.getGeneratedConfigDir(platform);

    return path.resolve(this.integration.root, p, CAPACITOR_CONFIG_JSON_FILE);
  }

  async getAndroidManifest(): Promise<CapacitorAndroidManifest> {
    const p = await this.getAndroidManifestPath();

    return CapacitorAndroidManifest.load(p);
  }

  async getAndroidManifestPath(): Promise<string> {
    const cli = await this.getCapacitorCLIConfig();
    const srcDir = cli?.android.srcMainDirAbs ?? 'android/app/src/main';

    return path.resolve(this.integration.root, srcDir, ANDROID_MANIFEST_FILE);
  }

  async getGeneratedConfigDir(platform: string): Promise<string> {
    const cli = await this.getCapacitorCLIConfig();

    switch (platform) {
      case 'android':
        return cli?.android.assetsDirAbs ?? 'android/app/src/main/assets';
      case 'ios':
        return cli?.ios.nativeTargetDirAbs ?? 'ios/App/App';
    }

    throw new FatalException(`Could not determine generated Capacitor config path for ${input(platform)} platform.`);
  }

  async getCapacitorCLIConfig(): Promise<CapacitorCLIConfig | undefined> {
    const capacitor = await this.getCapacitorIntegration();

    return capacitor.getCapacitorCLIConfig();
  }

  async getCapacitorConfig(): Promise<CapacitorConfig | undefined> {
    const capacitor = await this.getCapacitorIntegration();

    return capacitor.getCapacitorConfig();
  }

  getCapacitorIntegration = lodash.memoize(async (): Promise<CapacitorIntegration> => {
    if (!this.project) {
      throw new FatalException(`Cannot use Capacitor outside a project directory.`);
    }

    return this.project.createIntegration('capacitor');
  });

  getCapacitorVersion = lodash.memoize(async (): Promise<semver.SemVer> => {
    try {
      const proc = await this.env.shell.createSubprocess('capacitor', ['--version'], { cwd: this.integration.root });
      const version = semver.parse((await proc.output()).trim());

      if (!version) {
        throw new FatalException('Error while parsing Capacitor CLI version.');
      }

      return version;
    } catch (e) {
      if (e instanceof SubprocessError) {
        if (e.code === ERROR_COMMAND_NOT_FOUND) {
          throw new FatalException('Error while getting Capacitor CLI version. Is Capacitor installed?');
        }

        throw new FatalException('Error while getting Capacitor CLI version.\n' + (e.output ? e.output : e.code));
      }

      throw e;
    }
  });

  async getInstalledPlatforms(): Promise<string[]> {
    const cli = await this.getCapacitorCLIConfig();
    const androidPlatformDirAbs = cli?.android.platformDirAbs ?? path.resolve(this.integration.root, 'android');
    const iosPlatformDirAbs = cli?.ios.platformDirAbs ?? path.resolve(this.integration.root, 'ios');
    const platforms: string[] = [];

    if (await pathExists(androidPlatformDirAbs)) {
      platforms.push('android');
    }

    if (await pathExists(iosPlatformDirAbs)) {
      platforms.push('ios');
    }

    return platforms;
  }

  async isPlatformInstalled(platform: string): Promise<boolean> {
    const platforms = await this.getInstalledPlatforms();

    return platforms.includes(platform);
  }

  async checkCapacitor(runinfo: CommandInstanceInfo) {
    if (!this.project) {
      throw new FatalException(`Cannot use Capacitor outside a project directory.`);
    }

    const capacitor = this.project.getIntegration('capacitor');

    if (!capacitor) {
      await runCommand(runinfo, ['integrations', 'enable', 'capacitor']);
    }
  }

  async preRunChecks(runinfo: CommandInstanceInfo) {
    await this.checkCapacitor(runinfo);
  }

  async runCapacitor(argList: string[]) {
    if (!this.project) {
      throw new FatalException(`Cannot use Capacitor outside a project directory.`);
    }

    const stream = createPrefixedWriteStream(this.env.log, weak(`[capacitor]`));

    await this.env.shell.run('capacitor', argList, { stream, fatalOnNotFound: false, truncateErrorOutput: 5000, cwd: this.integration.root });
  }

  async runBuild(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (!this.project) {
      throw new FatalException(`Cannot use Capacitor outside a project directory.`);
    }

    const conf = await this.getCapacitorConfig();

    if (conf?.server?.url) {
      this.env.log.warn(
        `Capacitor server URL is in use.\n` +
        `This may result in unexpected behavior for this build, where an external server is used in the Web View instead of your app. This likely occurred because of ${input('--livereload')} usage in the past and the CLI improperly exiting without cleaning up.\n\n` +
        `Delete the ${input('server')} key in the Capacitor config file if you did not intend to use an external server.`
      );
      this.env.log.nl();
    }

    if (options['build']) {
      try {
        const runner = await this.project.requireBuildRunner();
        const runnerOpts = runner.createOptionsFromCommandLine(inputs, generateOptionsForCapacitorBuild(inputs, options));
        await runner.run(runnerOpts);
      } catch (e) {
        if (e instanceof RunnerException) {
          throw new FatalException(e.message);
        }

        throw e;
      }
    }
  }

  async runServe(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (!this.project) {
      throw new FatalException(`Cannot run ${input('ionic capacitor run')} outside a project directory.`);
    }

    const [ platform ] = inputs;

    try {
      const runner = await this.project.requireServeRunner();
      const runnerOpts = runner.createOptionsFromCommandLine(inputs, generateOptionsForCapacitorBuild(inputs, options));

      let serverUrl = options['livereload-url'] ? String(options['livereload-url']) : undefined;

      if (!serverUrl) {
        const details = await runner.run(runnerOpts);
        serverUrl = `${details.protocol || 'http'}://${details.externalAddress}:${details.port}`;
      }

      const conf = await this.getGeneratedConfig(platform);

      onBeforeExit(async () => {
        conf.resetServerUrl();
      });

      conf.setServerUrl(serverUrl);

      if (platform === 'android') {
        const manifest = await this.getAndroidManifest();

        onBeforeExit(async () => {
          await manifest.reset();
        });

        manifest.enableCleartextTraffic();
        await manifest.save();
      }
    } catch (e) {
      if (e instanceof RunnerException) {
        throw new FatalException(e.message);
      }

      throw e;
    }
  }

  async checkForPlatformInstallation(platform: string) {
    if (!this.project) {
      throw new FatalException('Cannot use Capacitor outside a project directory.');
    }

    if (platform) {
      const capacitor = this.project.getIntegration('capacitor');

      if (!capacitor) {
        throw new FatalException('Cannot check platform installations--Capacitor not yet integrated.');
      }

      if (!(await this.isPlatformInstalled(platform))) {
        await this.installPlatform(platform);
      }
    }
  }

  async installPlatform(platform: string): Promise<void> {
    const version = await this.getCapacitorVersion();
    const installedPlatforms = await this.getInstalledPlatforms();

    if (installedPlatforms.includes(platform)) {
      throw new FatalException(`The ${input(platform)} platform is already installed!`);
    }

    if (semver.gte(version, '3.0.0-alpha.1')) {
      const [ manager, ...managerArgs ] = await pkgManagerArgs(this.env.config.get('npmClient'), { command: 'install', pkg: `@capacitor/${platform}@next`, saveDev: true });
      await this.env.shell.run(manager, managerArgs, { cwd: this.integration.root });
    }

    await this.runCapacitor(['add', platform]);
  }

  protected async createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): Promise<IonicCapacitorOptions> {
    const separatedArgs = options['--'];
    const verbose = !!options['verbose'];
    const conf = await this.getCapacitorConfig();

    return {
      '--': separatedArgs ? separatedArgs : [],
      verbose,
      ...conf,
    };
  }
}
