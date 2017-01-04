import * as path from 'path';

import * as chalk from 'chalk';

import {
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  prettyPath,
  validators
} from '@ionic/cli-utils';

import { Command } from '../../command';
import { formatGitRepoUrl } from '../../utils/git';

@CommandMetadata({
  name: 'clone',
  description: 'Clones an Ionic app git repository to your computer',
  inputs: [
    {
      name: 'app-id',
      description: 'The App ID of the Ionic app to clone',
      validators: [validators.required]
    },
    {
      name: 'path',
      description: 'The destination directory of the cloned app'
    }
  ]
})
export class GitCloneCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    let [ app_id, destination ] = inputs;
    const [ app, configFile ] = await Promise.all([this.env.app.load(app_id), this.config.load()]);

    const remote = formatGitRepoUrl(configFile, app.id);

    if (!destination) {
      destination = app.slug ? app.slug : app.id;
    }

    destination = path.resolve(destination);

    await this.env.shell.run('git', ['clone', '-o', 'ionic', remote, destination], { stdio: 'inherit' });

    this.env.log.ok(`Your app has been cloned to ${chalk.bold(prettyPath(destination))}!`);
  }
}
