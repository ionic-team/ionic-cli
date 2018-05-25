import { CommandGroup, validators } from '@ionic/cli-framework';
import { CommandLineInputs, CommandLineOptions, CommandMetadata } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';

// import { formatGitRepoUrl } from '../../lib/git';

export class GitCloneCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'clone',
      type: 'global',
      summary: 'Clones an Ionic app git repository to your computer',
      inputs: [
        {
          name: 'pro-id',
          summary: 'The Pro ID of the Ionic app to clone',
          validators: [validators.required],
        },
        {
          name: 'path',
          summary: 'The destination directory of the cloned app',
        },
      ],
      groups: [CommandGroup.Hidden], // TODO: make part of start?
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    // let [ proId, destination ] = inputs;

    // const appLoader = new App(await this.env.session.getUserToken(), this.env.client);
    // const app = await appLoader.load(proId);
    // const remote = await formatGitRepoUrl(this.env.config, app.id);

    // if (!destination) {
    //   destination = app.slug ? app.slug : app.id;
    // }

    // destination = path.resolve(destination);

    // await this.env.shell.run('git', ['clone', '-o', 'ionic', remote, destination], { stdio: 'inherit' });

    // this.env.log.ok(`Your app has been cloned to ${chalk.bold(prettyPath(destination))}!`);
  }
}
