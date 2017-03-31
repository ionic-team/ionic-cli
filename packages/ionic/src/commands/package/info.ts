import * as chalk from 'chalk';

import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  PackageBuild,
  PackageClient,
  TaskChain,
  columnar,
} from '@ionic/cli-utils';

@CommandMetadata({
  name: 'info',
  description: 'Get info about a build',
  inputs: [
    {
      name: 'id',
      description: 'The build ID. Defaults to the latest build',
    },
  ],
  exampleCommands: [''],
})
export class PackageInfoCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    let [id] = inputs;
    let buildId = Number(id) !== NaN ? Number(id) : undefined;

    const tasks = new TaskChain();
    const token = await this.env.session.getAppUserToken();
    const pkg = new PackageClient(token, this.env.client);

    if (buildId) {
      tasks.next(`Retrieving information about build ${chalk.bold(String(buildId))}`);
    } else {
      tasks.next('Retrieving latest build information');
      const latestBuilds = await pkg.getBuilds({ pageSize: 1 });

      if (latestBuilds.length === 0) {
        tasks.end();
        return this.env.log.warn(`You don't have any builds yet! Run ${chalk.bold('ionic package build -h')} to learn how.`);
      }

      buildId = latestBuilds[0].id;
    }

    const build = await pkg.getBuild(buildId, { 'fields': ['output'] });
    const formattedBuild = pkg.formatBuildValues(build);
    tasks.end();

    const attrs: (keyof PackageBuild)[] = ['id', 'status', 'platform', 'mode', 'created', 'completed'];
    const table = columnar(attrs.map(attr => [chalk.bold(attr), formattedBuild[attr] || '']), {});

    this.env.log.nl();
    this.env.log.msg(table);
    this.env.log.nl();

    if (build.status === 'FAILED') {
      this.env.log.msg(`${chalk.bold('output')}:\n`);
      this.env.log.msg(build.output);
    }
  }
}
