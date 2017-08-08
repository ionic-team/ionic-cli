import * as fs from 'fs';
import * as path from 'path';
import * as chalk from 'chalk';

import { BACKEND_LEGACY, CommandLineInputs, CommandLineOptions } from '@ionic/cli-utils';
import { Command, CommandMetadata } from '@ionic/cli-utils/lib/command';

@CommandMetadata({
  name: 'download',
  type: 'project',
  backends: [BACKEND_LEGACY],
  description: 'Download your packaged app',
  longDescription: `
Ionic Package makes it easy to build a native binary of your app in the cloud.

Full documentation can be found here: ${chalk.bold('https://docs.ionic.io/services/package/')}
  `,
  exampleCommands: ['', '15', '--destination=my-builds'],
  inputs: [
    {
      name: 'id',
      description: 'The build ID to download. Defaults to the latest build',
      required: false,
    },
  ],
  options: [
    {
      name: 'destination',
      description: 'The download destination directory',
      aliases: ['d'],
    },
  ],
})
export class PackageDownloadCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { PackageClient } = await import('@ionic/cli-utils/lib/package');
    const { prettyPath } = await import('@ionic/cli-utils/lib/utils/format');

    let [ id ] = inputs;
    let { destination } = options;
    const destDir = path.resolve(destination || this.env.project.directory);
    let buildId = isNaN(Number(id)) ? undefined : Number(id);

    const token = await this.env.session.getAppUserToken();
    const pkg = new PackageClient(token, this.env.client);

    if (buildId) {
      this.env.tasks.next(`Retrieving information about build ${chalk.bold(String(buildId))}`);
    } else {
      this.env.tasks.next('Retrieving latest build information');
      const latestBuilds = await pkg.getBuilds({ pageSize: 1 });

      if (latestBuilds.length === 0) {
        this.env.tasks.end();
        return this.env.log.warn(`You don't have any builds yet! Run ${chalk.green('ionic package build --help')} to learn how.`);
      }

      buildId = latestBuilds[0].id;
    }

    const build = await pkg.getBuild(buildId, {});
    const buildFilename = path.join(destDir, pkg.formatFilename(build));
    this.env.tasks.end();

    const ws = fs.createWriteStream(buildFilename);
    const downloadTask = this.env.tasks.next(`Downloading build ${chalk.bold(String(build.id))}`);
    await pkg.downloadBuild(build, ws, { progress: (loaded, total) => {
      downloadTask.progress(loaded, total);
    }});

    this.env.tasks.end();
    this.env.log.ok(`Build ${chalk.bold(String(build.id))} downloaded as ${chalk.bold(prettyPath(buildFilename))}.`);
  }
}
