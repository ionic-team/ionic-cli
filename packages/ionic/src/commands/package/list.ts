import * as chalk from 'chalk';

import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  PackageBuild,
  PackageClient,
  columnar,
} from '@ionic/cli-utils';

@CommandMetadata({
  name: 'list',
  type: 'project',
  description: 'List your cloud builds',
  exampleCommands: [''],
})
export class PackageListCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const token = await this.env.session.getAppUserToken();
    const pkg = new PackageClient(token, this.env.client);

    this.env.tasks.next('Retrieving package builds');
    const builds = await pkg.getBuilds({});

    if (builds.length === 0) {
      this.env.tasks.end();
      return this.env.log.warn(`You don't have any builds yet! Run ${chalk.green('ionic package build -h')} to learn how.`);
    }

    const attrs: (keyof PackageBuild)[] =  ['id', 'status', 'platform', 'mode', 'created', 'completed'];
    const buildsMatrix = builds.map((build) => {
      const formattedBuild = pkg.formatBuildValues(build);
      return attrs.map(attr => formattedBuild[attr] || '');
    });

    const table = columnar(buildsMatrix, {
      columnHeaders: attrs.map((attr) => {
        if (attr === 'created') {
          return 'started';
        } else if (attr === 'completed') {
          return 'finished';
        }

        return attr;
      }),
    });

    this.env.tasks.end();

    this.env.log.nl();
    this.env.log.msg(table);
    this.env.log.nl();
    this.env.log.ok(`Showing ${chalk.bold(String(builds.length))} of your latest builds.`);
    this.env.log.nl();
  }
}
