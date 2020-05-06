import { pathExists } from '@ionic/utils-fs';
import { ERROR_COMMAND_NOT_FOUND, ERROR_SIGNAL_EXIT, SubprocessError } from '@ionic/utils-subprocess';
import * as path from 'path';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, IonicCapacitorOptions, ProjectIntegration } from '../../definitions';
import { input, strong } from '../../lib/color';
import { Command } from '../../lib/command';
import { FatalException, RunnerException } from '../../lib/errors';
import { runCommand } from '../../lib/executor';
import { CAPACITOR_CONFIG_FILE, CapacitorConfig } from '../../lib/integrations/capacitor/config';
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

  getCapacitorConfig(): CapacitorConfig {
    if (!this.project) {
      throw new FatalException(`Cannot use Capacitor outside a project directory.`);
    }

    return new CapacitorConfig(path.resolve(this.project.directory, CAPACITOR_CONFIG_FILE));
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

    const conf = this.getCapacitorConfig();
    const serverConfig = conf.get('server');

    if (serverConfig && serverConfig.url) {
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
      const integrationRoot = this.project.directory;
      const platformsToCheck = ['android', 'ios', 'electron'];
      const platforms = (await Promise.all(platformsToCheck.map(async (p): Promise<[string, boolean]> => [p, await pathExists(path.resolve(integrationRoot, p))])))
        .filter(([, e]) => e)
        .map(([p]) => p);

      if (!platforms.includes(platform)) {
        await this._runCapacitor(['add', platform]);
      }
    }
  }

  protected createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): IonicCapacitorOptions {
    const separatedArgs = options['--'];
    const verbose = !!options['verbose'];
    const conf = this.getCapacitorConfig();
    const server = conf.get('server');

    return {
      '--': separatedArgs ? separatedArgs : [],
      appId: conf.get('appId'),
      appName: conf.get('appName'),
      server: {
        url: server?.url,
      },
      verbose,
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
