import {
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata
} from '@ionic/cli';

import { Command } from '../../command';
import { formatGitRepoUrl } from '../../utils/git';

@CommandMetadata({
  name: 'remote',
  description: 'Adds a git remote to your local Ionic app repository',
  isProjectTask: true
})
export class GitRemoteCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [ appId, configFile ] = await Promise.all([this.env.project.loadAppId(), this.config.load()]);
    const remote = formatGitRepoUrl(configFile, appId);
    const regex = /ionic\t(.+) \(\w+\)/;

    // would like to use get-url, but not available in git 2.0.0
    const remotes = await this.env.shell.run('git', ['remote', '-v'], { show: false });

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
        this.env.log.ok('Existing remote found.');
      } else {
        await this.env.shell.run('git', ['remote', 'set-url', 'ionic', remote]);
        this.env.log.ok('Updated remote.');
      }
    } else {
      await this.env.shell.run('git', ['remote', 'add', 'ionic', remote]);
      this.env.log.ok('Added remote.');
    }
  }
}
