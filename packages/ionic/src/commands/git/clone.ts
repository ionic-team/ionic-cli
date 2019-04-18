import { MetadataGroup, validators } from '@ionic/cli-framework';

import { CommandLineInputs, CommandLineOptions, CommandMetadata } from '../../definitions';
import { Command } from '../../lib/command';

// import { formatGitRepoUrl } from '../../lib/git';

export class GitCloneCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'clone',
      type: 'global',
      summary: 'Clones an Ionic app git repository to your computer',
      inputs: [
        {
          name: 'id',
          summary: 'The ID of the Ionic Appflow app to clone',
          validators: [validators.required],
        },
        {
          name: 'path',
          summary: 'The destination directory of the cloned app',
        },
      ],
      groups: [MetadataGroup.HIDDEN], // TODO: make part of start?
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    // let [ id, destination ] = inputs;

    // const appLoader = new App(this.env.session.getUserToken(), this.env.client);
    // const app = await appLoader.load(id);
    // const remote = await formatGitRepoUrl(this.env.config, app.id);

    // if (!destination) {
    //   destination = app.slug ? app.slug : app.id;
    // }

    // destination = path.resolve(destination);

    // await this.env.shell.run('git', ['clone', '-o', 'ionic', remote, destination], { stdio: 'inherit' });

    // this.env.log.ok(`Your app has been cloned to ${strong(prettyPath(destination))}!`);
  }
}
