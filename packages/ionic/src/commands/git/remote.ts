import * as path from 'path';

import * as chalk from 'chalk';

import { BACKEND_PRO, CommandLineInputs, CommandLineOptions } from '@ionic/cli-utils';
import { Command, CommandMetadata } from '@ionic/cli-utils/lib/command';
import { pathExists } from '@ionic/cli-utils/lib/utils/fs';

@CommandMetadata({
  name: 'remote',
  type: 'project',
  backends: [BACKEND_PRO],
  description: 'Adds/updates the Ionic git remote to your local Ionic app repository',
})
export class GitRemoteCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { App } = await import('@ionic/cli-utils/lib/app');

    const token = await this.env.session.getUserToken();
    const appId = await this.env.project.loadAppId();
    const appLoader = new App(token, this.env.client);
    const app = await appLoader.load(appId);

    if (!app.repo_url) {
      throw this.exit(`Missing ${chalk.bold('repo_url')} property in app.`);
    }

    if (!(await pathExists(path.join(this.env.project.directory, '.git')))) {
      this.env.log.warn(
        `Initializing a git repository for your project.\n` +
        `Before your first ${chalk.green('git push ionic master')}, you'll want to commit all the files in your project:\n\n` +
        `${chalk.green('git commit -a -m "Initial commit"')}\n`
      );
      await this.env.shell.run('git', ['init'], { showSpinner: false, cwd: this.env.project.directory });
    }

    const remote = app.repo_url;
    const regex = /ionic\t(.+) \(\w+\)/;

    // would like to use get-url, but not available in git 2.0.0
    const remotes = await this.env.shell.run('git', ['remote', '-v'], { showCommand: false, cwd: this.env.project.directory });

    let found = false;
    let matches = true;

    for (let line of remotes.split('\n')) {
      const match = regex.exec(line.trim());

      if (match) {
        found = true;

        if (match[1] !== remote) {
          matches = false;
          break;
        }
      }
    }

    if (found) {
      if (matches) {
        this.env.log.info(`Existing remote ${chalk.bold('ionic')} found.`);
      } else {
        await this.env.shell.run('git', ['remote', 'set-url', 'ionic', remote], { showSpinner: false, cwd: this.env.project.directory });
        this.env.log.ok(`Updated remote ${chalk.bold('ionic')}.`);
      }
    } else {
      await this.env.shell.run('git', ['remote', 'add', 'ionic', remote], { showSpinner: false, cwd: this.env.project.directory });
      this.env.log.ok(`Added remote ${chalk.bold('ionic')}.`);
    }
  }
}
