import { ERROR_SHELL_COMMAND_NOT_FOUND, ERROR_SHELL_SIGNAL_EXIT, ShellCommandError } from '@ionic/cli-framework';
import { pathExists } from '@ionic/utils-fs';
import chalk from 'chalk';
import * as path from 'path';

import { CommandInstanceInfo, ProjectIntegration } from '../../definitions';
import { Command } from '../../lib/command';
import { FatalException } from '../../lib/errors';
import { runCommand } from '../../lib/executor';

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
      if (e instanceof ShellCommandError) {
        if (e.code === ERROR_SHELL_COMMAND_NOT_FOUND) {
          const pkg = '@capacitor/cli';
          const requiredMsg = `The Capacitor CLI is required for Capacitor projects.`;
          this.env.log.nl();
          this.env.log.info(`Looks like ${chalk.green(pkg)} isn't installed in this project.\n` + requiredMsg);
          this.env.log.nl();

          const installed = await this.promptToInstallCapacitor();

          if (!installed) {
            throw new FatalException(`${chalk.green(pkg)} is required for Capacitor projects.`);
          }

          return this.runCapacitor(argList);
        }

        if (e.code === ERROR_SHELL_SIGNAL_EXIT) {
          return;
        }
      }

      throw e;
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

  private async promptToInstallCapacitor(): Promise<boolean> {
    if (!this.project) {
      throw new FatalException(`Cannot use Capacitor outside a project directory.`);
    }

    const { pkgManagerArgs } = await import('../../lib/utils/npm');

    const pkg = '@capacitor/cli';
    const [ manager, ...managerArgs ] = await pkgManagerArgs(this.env.config.get('npmClient'), { pkg, command: 'install', saveDev: true });

    const confirm = await this.env.prompt({
      name: 'confirm',
      message: `Install ${chalk.green(pkg)}?`,
      type: 'confirm',
    });

    if (!confirm) {
      this.env.log.warn(`Not installing--here's how to install manually: ${chalk.green(`${manager} ${managerArgs.join(' ')}`)}`);
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
