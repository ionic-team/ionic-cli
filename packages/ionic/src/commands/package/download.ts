import * as fs from 'fs';
import * as path from 'path';
import * as chalk from 'chalk';

import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  PackageClient,
  TaskChain,
  permissionToOverwrite,
  prettyPath,
} from '@ionic/cli-utils';

@CommandMetadata({
  name: 'download',
  description: 'Download your packaged app',
  inputs: [
    {
      name: 'id',
      description: 'The build ID to download. Defaults to the latest build',
    },
  ],
  options: [
    {
      name: 'destination',
      description: 'The download destination directory',
      aliases: ['d'],
    },
    {
      name: 'y',
      description: 'Answer YES to all confirmation prompts',
      type: Boolean,
    }
  ],
  exampleCommands: [''],
})
export class PackageDownloadCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    let [id] = inputs;
    let { destination, y } = options;
    const destDir = path.resolve(destination || this.env.project.directory);
    const skipPrompts = y || false;
    let buildId: undefined | number = Number(id) !== NaN ? Number(id) : undefined;

    const tasks = new TaskChain();
    const token = await this.env.session.getAppUserToken();
    const pkg = new PackageClient(token, this.env.client);

    if (!buildId) {
      tasks.next('Retrieving latest build');
      const latestBuilds = await pkg.getBuilds({ pageSize: 1 });

      if (latestBuilds.length === 0) {
        tasks.end();
        return this.env.log.warn(`You don't have any builds yet! Run ${chalk.bold('ionic package build -h')} to learn how.`);
      }

      buildId = latestBuilds[0].id;
    }

    const build = await pkg.getBuild(buildId, {});
    const buildFilename = path.join(destDir, pkg.formatFilename(build));
    tasks.end();

    if (!skipPrompts && !(await permissionToOverwrite(buildFilename))) {
      return this.env.log.ok(`Not overwriting ${chalk.bold(prettyPath(buildFilename))}.`);
    }

    const ws = fs.createWriteStream(buildFilename);
    const downloadTask = tasks.next(`Downloading build ${chalk.bold(String(build.id))}`);
    await pkg.downloadBuild(build, ws, { progress: (loaded, total) => {
      downloadTask.progress(loaded, total);
    }});

    tasks.end();
    this.env.log.ok(`Build ${chalk.bold(String(build.id))} downloaded as ${chalk.bold(prettyPath(buildFilename))}.`);
  }
}
