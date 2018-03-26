import { CommandInstanceInfo, IShellRunOptions } from '@ionic/cli-utils';
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

  async runCapacitor(argList: string[], { fatalOnNotFound = false, truncateErrorOutput = 5000, ...options }: IShellRunOptions = {}): Promise<void> {
    const { ERROR_SHELL_COMMAND_NOT_FOUND } = await import('@ionic/cli-utils/lib/shell');
    try {
      this.env.close();
      await this.env.shell.run('npx', ['capacitor'].concat(argList), { fatalOnNotFound, truncateErrorOutput, stdio: 'inherit', ...options });
      this.env.open();
    } catch (e) {
      this.env.open();
      if (e === ERROR_SHELL_COMMAND_NOT_FOUND) {
        throw new FatalException(
          `Unable to run npx, the new command execution system in NPM.
          This means your Node version is too old. Capacitor requires Node 8.6.0 or greater,
          and npm version 5.6.0 or greater.
          Visit https://nodejs.org/en/ and install the latest LTS version`
        );
      }

      if (options.fatalOnError) {
        this.env.log.nl();
        this.env.log.error('Please see error above to fix problems running command');
      }

      throw e;
    }
  }
}
