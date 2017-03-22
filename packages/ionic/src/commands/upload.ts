import * as path from 'path';

import * as chalk from 'chalk';

import {
  Command,
  CommandLineInput,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  DeployChannel,
  DeployClient,
  TaskChain,
  createZipStream,
} from '@ionic/cli-utils';

@CommandMetadata({
  name: 'upload',
  description: 'Upload a new snapshot of your app',
  exampleCommands: [''],
  options: [
    {
      name: 'note',
      description: 'Give this snapshot a nice description',
    },
    {
      name: 'deploy',
      description: 'Deploys this snapshot to the given channel',
    },
  ],
  requiresProject: true
})
export class UploadCommand extends Command {
  resolveNote(input: CommandLineInput): string | undefined {
    if (typeof input !== 'string') {
      input = undefined;
    }

    return input;
  }

  resolveChannelTag(input: CommandLineInput): string | undefined {
    if (typeof input !== 'string') {
      input = undefined;
    } else if (input === '') {
      input = 'dev';
    }

    return input;
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const note = this.resolveNote(options['note']);
    const channelTag = this.resolveChannelTag(options['deploy']);
    let channel: DeployChannel | undefined;

    const tasks = new TaskChain();
    const token = await this.env.session.getAppUserToken();
    const deploy = new DeployClient(token, this.env.client);

    if (channelTag) {
      tasks.next('Retrieving deploy channel');
      channel = await deploy.getChannel(channelTag);
    }

    const wwwPath = path.join(this.env.project.directory, 'www'); // TODO don't hardcode
    const zip = createZipStream(wwwPath);

    tasks.next('Requesting snapshot');
    const snapshot = await deploy.requestSnapshotUpload({ note });
    const uploadTask = tasks.next('Uploading snapshot');
    await deploy.uploadSnapshot(snapshot, zip, (loaded, total) => {
      uploadTask.progress(loaded, total);
    });

    tasks.end();
    this.env.log.ok(`Uploaded snapshot ${chalk.bold(snapshot.uuid)}!`);

    if (channel) {
      tasks.next(`Deploying to '${channel.tag}' channel`);
      await deploy.deploy(snapshot.uuid, channel.uuid);
      tasks.end();
      this.env.log.ok(`Deployed snapshot ${chalk.bold(snapshot.uuid)} to channel ${chalk.bold(channel.tag)}!`);
    }
  }

}
