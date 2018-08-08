import chalk from 'chalk';

import { ERROR_SHELL_COMMAND_NOT_FOUND, ShellCommandError } from '@ionic/cli-framework';
import { CommandInstanceInfo } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';
import { FatalException } from '@ionic/cli-utils/lib/errors';
import { runCommand } from '@ionic/cli-utils/lib/executor';

export abstract class CapacitorCommand extends Command {
  async checkCapacitor(runinfo: CommandInstanceInfo) {
    if (!this.project) {
      throw new FatalException(`Cannot use Capacitor outside a project directory.`);
    }

    const integration = this.project.config.get('integrations').capacitor;

    if (integration && integration.enabled === false) {
      return;
    }

    if (!integration) {
      await runCommand(runinfo, ['integrations', 'enable', 'capacitor']);
    }
  }

  async preRunChecks(runinfo: CommandInstanceInfo) {
    await this.checkCapacitor(runinfo);
  }

  async runCapacitor(argList: string[]): Promise<void> {
    try {
      await this._runCapacitor(argList);
    } catch (e) {
      if (e instanceof ShellCommandError && e.code === ERROR_SHELL_COMMAND_NOT_FOUND) {
        const pkg = '@capacitor/cli';
        const requiredMsg = `The Capacitor CLI is required for Capacitor projects.`;
        this.env.log.nl();
        this.env.log.info(`Looks like ${chalk.green(pkg)} isn't installed in this project.\n` + requiredMsg);
        this.env.log.nl();

        const installed = await this.promptToInstallCapacitor();

        if (!installed) {
          throw new FatalException(`${chalk.green(pkg)} is required for Capacitor projects.`);
        }

        await this._runCapacitor(argList);
      } else {
        throw e;
      }
    }
  }

  private async promptToInstallCapacitor(): Promise<boolean> {
    if (!this.project) {
      throw new FatalException(`Cannot use Capacitor outside a project directory.`);
    }

    const { pkgManagerArgs } = await import('@ionic/cli-utils/lib/utils/npm');

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
    await this.env.shell.run('capacitor', argList, { fatalOnNotFound: false, truncateErrorOutput: 5000, stdio: 'inherit' });
  }
}
