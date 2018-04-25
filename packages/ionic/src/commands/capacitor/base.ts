import chalk from 'chalk';

import { CommandInstanceInfo } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';
import { FatalException } from '@ionic/cli-utils/lib/errors';
import { runCommand } from '@ionic/cli-utils/lib/executor';

export abstract class CapacitorCommand extends Command {
  async checkCapacitor(runinfo: CommandInstanceInfo) {
    const project = await this.env.project.load();

    if (project.integrations.capacitor && project.integrations.capacitor.enabled === false) {
      return;
    }
    if (!project.integrations.capacitor) {
      await runCommand(runinfo, ['integrations', 'enable', 'capacitor']);
    }
  }

  async preRunChecks(runinfo: CommandInstanceInfo) {
    runinfo;
  }

  async runCapacitor(argList: string[]): Promise<void> {
    const { ERROR_SHELL_COMMAND_NOT_FOUND } = await import('@ionic/cli-utils/lib/shell');

    try {
      this.env.close();
      await this._runCapacitor(argList);
      this.env.open();
    } catch (e) {
      this.env.open();
      if (e === ERROR_SHELL_COMMAND_NOT_FOUND) {
        const pkg = '@capacitor/cli';
        const requiredMsg = `The Capacitor CLI is required for Capacitor projects.`;
        this.env.log.nl();
        this.env.log.info(`Looks like ${chalk.green(pkg)} isn't installed in this project.\n` + requiredMsg);

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
    const { pkgManagerArgs } = await import('@ionic/cli-utils/lib/utils/npm');
    const config = await this.env.config.load();
    const { npmClient } = config;

    const pkg = '@capacitor/cli';
    const [ manager, ...managerArgs ] = await pkgManagerArgs(npmClient, { pkg, command: 'install', saveDev: true });

    const confirm = await this.env.prompt({
      name: 'confirm',
      message: `Install ${chalk.green(pkg)}?`,
      type: 'confirm',
    });

    if (!confirm) {
      this.env.log.warn(`Not installing--here's how to install manually: ${chalk.green(`${manager} ${managerArgs.join(' ')}`)}`);
      return false;
    }

    await this.env.shell.run(manager, managerArgs, { cwd: this.env.project.directory });

    return true;
  }

  private async _runCapacitor(argList: string[]) {
    await this.env.shell.run('capacitor', argList, { fatalOnNotFound: false, truncateErrorOutput: 5000, stdio: 'inherit' });
  }
}
