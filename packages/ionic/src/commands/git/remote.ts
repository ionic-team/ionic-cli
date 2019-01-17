import chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, CommandMetadata } from '../../definitions';
import { Command } from '../../lib/command';
import { FatalException } from '../../lib/errors';

export class GitRemoteCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    const dashUrl = this.env.config.getDashUrl();

    return {
      name: 'remote',
      type: 'project',
      summary: 'Adds/updates the Ionic Appflow git remote to your local Ionic app',
      description: `
This command is used by ${chalk.green('ionic link')} when Ionic Appflow is used as the git host.

${chalk.green('ionic git remote')} will check the local repository for whether or not the git remote is properly set up. This command operates on the ${chalk.bold('ionic')} remote. For advanced configuration, see ${chalk.bold('Settings')} => ${chalk.bold('Git')} in the app settings of the Dashboard[^dashboard].
      `,
      footnotes: [
        {
          id: 'dashboard',
          url: dashUrl,
        },
      ],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { AppClient } = await import('../../lib/app');
    const { addIonicRemote, getIonicRemote, initializeRepo, isRepoInitialized, setIonicRemote } = await import('../../lib/git');

    if (!this.project) {
      throw new FatalException(`Cannot run ${chalk.green('ionic git remote')} outside a project directory.`);
    }

    const token = this.env.session.getUserToken();
    const id = await this.project.requireAppflowId();
    const appClient = new AppClient(token, this.env);
    const app = await appClient.load(id);

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
