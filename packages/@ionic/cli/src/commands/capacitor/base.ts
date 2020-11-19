import { pathExists } from '@ionic/utils-fs';
import { ERROR_COMMAND_NOT_FOUND, ERROR_SIGNAL_EXIT, SubprocessError } from '@ionic/utils-subprocess';
import * as path from 'path';
import * as semver from 'semver';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, IonicCapacitorOptions, ProjectIntegration } from '../../definitions';
import { input, strong } from '../../lib/color';
import { Command } from '../../lib/command';
import { FatalException, RunnerException } from '../../lib/errors';
import { runCommand } from '../../lib/executor';
import type { CapacitorCLIConfig, Integration as CapacitorIntegration } from '../../lib/integrations/capacitor'
import { ANDROID_MANIFEST_FILE, CapacitorAndroidManifest } from '../../lib/integrations/capacitor/android';
import { CAPACITOR_CONFIG_FILE, CapacitorConfig, CapacitorConfigFile } from '../../lib/integrations/capacitor/config';
import { generateOptionsForCapacitorBuild } from '../../lib/integrations/capacitor/utils';

export abstract class CapacitorCommand extends Command {
  private _integration?: Required<ProjectIntegration>;
  private _integrationObject?: CapacitorIntegration;
  private _cliconfig?: CapacitorCLIConfig;

  get integration(): Required<ProjectIntegration> {
    if (!this.project) {
      throw new FatalException(`Cannot use Capacitor outside a project directory.`);
    }

    if (!this._integration) {
      this._integration = this.project.requireIntegration('capacitor');
    }

    return this._integration;
  }

  async getGeneratedConfig(platform: string): Promise<CapacitorConfig> {
    if (!this.project) {
      throw new FatalException(`Cannot use Capacitor outside a project directory.`);
    }

    const p = await this.getGeneratedConfigPath(platform);

    return new CapacitorConfig(p);
  }

  async getGeneratedConfigPath(platform: string): Promise<string> {
    if (!this.project) {
      throw new FatalException(`Cannot use Capacitor outside a project directory.`);
    }

    const p = await this.getGeneratedConfigDir(platform);

    return path.resolve(this.project.directory, p, CAPACITOR_CONFIG_FILE);
  }

  async getAndroidManifest(): Promise<CapacitorAndroidManifest> {
    const p = await this.getAndroidManifestPath();

    return CapacitorAndroidManifest.load(p);
  }

  async getAndroidManifestPath(): Promise<string> {
    const cli = await this.getCapacitorCLIConfig();
    const srcDir = cli?.android.srcDirAbs ?? 'android/app/src/main';

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

  async getCapacitorConfig(): Promise<CapacitorConfigFile | undefined> {
    // try using `capacitor config --json`
    const cli = await this.getCapacitorCLIConfig();

    if (cli) {
      return cli.app.extConfig;
    }

    if (!this.project) {
      return;
    }

    try {
      // fallback to reading capacitor.config.json if it exists
      const conf = new CapacitorConfig(path.resolve(this.project.directory, CAPACITOR_CONFIG_FILE));
      return conf.c;
    } catch (e) {
      // ignore
    }
  }

  async getCapacitorCLIConfig(): Promise<CapacitorCLIConfig | undefined> {
    if (!this._cliconfig) {
      const capacitor = await this.getCapacitorIntegration();
      this._cliconfig = await capacitor.getCapacitorCLIConfig();
    }

    return this._cliconfig;
  }

  async getCapacitorIntegration() {
    if (!this.project) {
      throw new FatalException(`Cannot use Capacitor outside a project directory.`);
    }

    if (!this._integrationObject) {
      this._integrationObject = await this.project.createIntegration('capacitor');
    }

    return this._integrationObject;
  }

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

  async runCapacitor(argList: string[]): Promise<void> {
    try {
      return await this._runCapacitor(argList);
    } catch (e) {
      if (e instanceof SubprocessError) {
        if (e.code === ERROR_COMMAND_NOT_FOUND) {
          const pkg = '@capacitor/cli';
          const requiredMsg = `The Capacitor CLI is required for Capacitor projects.`;
          this.env.log.nl();
          this.env.log.info(`Looks like ${input(pkg)} isn't installed in this project.\n` + requiredMsg);
          this.env.log.nl();

          const installed = await this.promptToInstallCapacitor();

          if (!installed) {
            throw new FatalException(`${input(pkg)} is required for Capacitor projects.`);
          }

          return this.runCapacitor(argList);
        }

        if (e.code === ERROR_SIGNAL_EXIT) {
          return;
        }
      }

      throw e;
    }
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
        `Delete the ${input('server')} key in the ${strong(CAPACITOR_CONFIG_FILE)} file if you did not intend to use an external server.`
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
        await this._runCapacitor(['add', platform]);
      }
    }
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

  private async promptToInstallCapacitor(): Promise<boolean> {
    if (!this.project) {
      throw new FatalException(`Cannot use Capacitor outside a project directory.`);
    }

    const { pkgManagerArgs } = await import('../../lib/utils/npm');

    const pkg = '@capacitor/cli';
    const [ manager, ...managerArgs ] = await pkgManagerArgs(this.env.config.get('npmClient'), { pkg, command: 'install', saveDev: true });

    const confirm = await this.env.prompt({
      name: 'confirm',
      message: `Install ${input(pkg)}?`,
      type: 'confirm',
    });

    if (!confirm) {
      this.env.log.warn(`Not installing--here's how to install manually: ${input(`${manager} ${managerArgs.join(' ')}`)}`);
      return false;
    }

    await this.env.shell.run(manager, managerArgs, { cwd: this.project.directory });

    return true;
  }

  private async _runCapacitor(argList: string[]) {
    if (!this.project) {
      throw new FatalException(`Cannot use Capacitor outside a project directory.`);
    }

    await this.env.shell.run('capacitor', argList, { fatalOnNotFound: false, truncateErrorOutput: 5000, stdio: 'inherit', cwd: this.integration.root });
  }
}
