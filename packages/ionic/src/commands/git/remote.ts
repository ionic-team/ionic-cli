import chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, CommandMetadata } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';
import { FatalException } from '@ionic/cli-utils/lib/errors';

export class GitRemoteCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'remote',
      type: 'project',
      summary: 'Adds/updates the Ionic git remote to your local Ionic app repository',
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { AppClient } = await import('@ionic/cli-utils/lib/app');
    const { addIonicRemote, getIonicRemote, initializeRepo, isRepoInitialized, setIonicRemote } = await import('@ionic/cli-utils/lib/git');

    if (!this.project) {
      throw new FatalException(`Cannot run ${chalk.green('ionic git remote')} outside a project directory.`);
    }

    const token = await this.env.session.getUserToken();
    const proId = await this.project.requireProId();
    const appClient = new AppClient({ token, client: this.env.client });
    const app = await appClient.load(proId);

    if (!app.repo_url) {
      throw new FatalException(`Missing ${chalk.bold('repo_url')} property in app.`);
    }

    if (!(await isRepoInitialized(this.project.directory))) {
      await initializeRepo({ shell: this.env.shell }, this.project.directory);

      this.env.log.warn(
        `Initializing a git repository for your project.\n` +
        `Before your first ${chalk.green('git push ionic master')}, you'll want to commit all the files in your project:\n\n` +
        `${chalk.green('git commit -a -m "Initial commit"')}\n`
      );
    }

    const remote = app.repo_url;
    const found = await getIonicRemote({ shell: this.env.shell }, this.project.directory);

    if (found) {
      if (remote === found) {
        this.env.log.msg(`Existing remote ${chalk.bold('ionic')} found.`);
      } else {
        await setIonicRemote({ shell: this.env.shell }, this.project.directory, remote);
        this.env.log.ok(`Updated remote ${chalk.bold('ionic')}.`);
      }
    } else {
      await addIonicRemote({ shell: this.env.shell }, this.project.directory, remote);
      this.env.log.ok(`Added remote ${chalk.bold('ionic')}.`);
    }
  }
}
