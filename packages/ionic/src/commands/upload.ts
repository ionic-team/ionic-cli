import * as path from 'path';

import * as chalk from 'chalk';

import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
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
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (options['deploy'] === '') {
      options['deploy'] = 'dev';
    }

    if (options['deploy']) {
    }

    const tasks = new TaskChain();

    const token = await this.env.session.getAppUserToken();
    const wwwPath = path.join(this.env.project.directory, 'www'); // TODO don't hardcode
    const zip = createZipStream(wwwPath);

    const deploy = new DeployClient(this.env.client);
    tasks.next('Requesting snapshot');
    const snapshot = await deploy.requestSnapshotUpload(token);
    const uploadTask = tasks.next('Uploading snapshot');
    await deploy.uploadSnapshot(snapshot, zip, (loaded, total) => {
      uploadTask.progress(loaded, total);
    });

    tasks.end();

    this.env.log.ok(`Uploaded snapshot ${chalk.bold(snapshot.uuid)}!`);
  }

}
