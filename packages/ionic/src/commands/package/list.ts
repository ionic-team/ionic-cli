import * as chalk from 'chalk';

import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  PackageClient,
  TaskChain,
  columnar,
} from '@ionic/cli-utils';

@CommandMetadata({
  name: 'list',
  description: 'List your cloud builds',
  exampleCommands: [''],
})
export class PackageListCommand extends Command {
  colorStatus(status: string) {
    switch (status) {
      case 'SUCCESS':
        return chalk.green('SUCCESS');
      case 'FAILED':
        return chalk.red('FAILED');
    }

    return status;
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const tasks = new TaskChain();
    const token = await this.env.session.getAppUserToken();
    const pkg = new PackageClient(token, this.env.client);

    tasks.next('Retrieving package builds');
    const builds = await pkg.getBuilds({});

    if (builds.length === 0) {
      tasks.end();
      return this.env.log.warn(`You don't have any builds yet! Run ${chalk.bold('ionic package build -h')} to learn how.`);
    }

    const buildsMatrix = builds.map(({ id, created, completed, platform, status, mode }) => {
      return [
        String(id),
        this.colorStatus(status),
        platform,
        mode,
        new Date(created).toLocaleString(),
        completed ? new Date(completed).toLocaleString() : '',
      ];
    });

    const table = columnar(buildsMatrix, {
      columnHeaders: ['id', 'status', 'platform', 'mode', 'started', 'finished'],
    });

    tasks.end();

    this.env.log.nl();
    this.env.log.msg(table);
    this.env.log.nl();
    this.env.log.ok(`Showing ${chalk.bold(String(builds.length))} of your latest builds.`);
    this.env.log.nl();
  }
}
