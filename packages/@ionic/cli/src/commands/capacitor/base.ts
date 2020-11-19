import { pathExists } from '@ionic/utils-fs';
import * as lodash from 'lodash';
import * as path from 'path';
import * as semver from 'semver';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, IonicCapacitorOptions, ProjectIntegration } from '../../definitions';
import { input } from '../../lib/color';
import { Command } from '../../lib/command';
import { FatalException, RunnerException } from '../../lib/errors';
import { runCommand } from '../../lib/executor';
import type { CapacitorCLIConfig, Integration as CapacitorIntegration } from '../../lib/integrations/capacitor'
import { ANDROID_MANIFEST_FILE, CapacitorAndroidManifest } from '../../lib/integrations/capacitor/android';
import { CAPACITOR_CONFIG_JSON_FILE, CapacitorJSONConfig } from '../../lib/integrations/capacitor/config';
import { generateOptionsForCapacitorBuild } from '../../lib/integrations/capacitor/utils';

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

  getCapacitorIntegration = lodash.memoize(async (): Promise<CapacitorIntegration> => {
    if (!this.project) {
      throw new FatalException(`Cannot use Capacitor outside a project directory.`);
    }

    return this.project.createIntegration('capacitor');
  });

  async getCapacitorVersion(): Promise<semver.SemVer> {
    const capacitor = await this.getCapacitorIntegration();
    const version = semver.parse(await capacitor.getCapacitorCLIVersion());

    if (!version) {
      throw new FatalException('Error while getting Capacitor CLI version. Is Capacitor installed?');
    }

    return version;
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

    await this.env.shell.run('capacitor', argList, { fatalOnNotFound: false, truncateErrorOutput: 5000, stdio: 'inherit', cwd: this.integration.root });
  }

  async runBuild(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (!this.project) {
      throw new FatalException(`Cannot use Capacitor outside a project directory.`);
    }

    const cli = await this.getCapacitorCLIConfig();

    if (cli?.app.extConfig.server?.url) {
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

  async checkForPlatformInstallation(platform: string) {
    if (!this.project) {
      throw new FatalException('Cannot use Capacitor outside a project directory.');
    }

    if (platform) {
      const capacitor = this.project.getIntegration('capacitor');

      if (!capacitor) {
        throw new FatalException('Cannot check platform installations--Capacitor not yet integrated.');
      }

      const integrationRoot = capacitor.root;
      const platformsToCheck = ['android', 'ios', 'electron'];
      const platforms = (await Promise.all(platformsToCheck.map(async (p): Promise<[string, boolean]> => [p, await pathExists(path.resolve(integrationRoot, p))])))
        .filter(([, e]) => e)
        .map(([p]) => p);

      if (!platforms.includes(platform)) {
        await this.runCapacitor(['add', platform]);
      }
    }
  }

  protected async createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): Promise<IonicCapacitorOptions> {
    const separatedArgs = options['--'];
    const verbose = !!options['verbose'];
    const capacitor = await this.getCapacitorIntegration();
    const conf = await capacitor.getCapacitorConfig();

    return {
      '--': separatedArgs ? separatedArgs : [],
      verbose,
      ...conf,
    };
  }
}
