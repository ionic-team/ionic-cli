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
  name: 'info',
  type: 'project',
  description: 'Get info about a build',
  longDescription: `
Ionic Package makes it easy to build a native binary of your app in the cloud.

Full documentation can be found here: ${chalk.bold('https://docs.ionic.io/services/package/')}
  `,
  exampleCommands: ['', '15'],
  inputs: [
    {
      name: 'id',
      description: 'The build ID. Defaults to the latest build',
      required: false,
    },
  ],
})
export class PackageInfoCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [ id ] = inputs;
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

    const build = await pkg.getBuild(buildId, { 'fields': ['output'] });
    const formattedBuild = pkg.formatBuildValues(build);
    this.env.tasks.end();

    const attrs: (keyof PackageBuild)[] = ['id', 'status', 'platform', 'mode', 'security_profile_tag', 'created', 'completed'];
    const formatAttr = (attr: keyof PackageBuild): string => {
      let r: string = attr;

      if (attr === 'created') {
        r = 'started';
      } else if (attr === 'completed') {
        r = 'finished';
      } else if (attr === 'security_profile_tag') {
        r = 'profile';
      }

      return chalk.bold(r);
    };

    const table = columnar(attrs.map(attr => [formatAttr(attr), formattedBuild[attr] || '']), {});

    this.env.log.nl();
    this.env.log.msg(table);
    this.env.log.nl();

    if (build.status === 'FAILED') {
      if (build.output) {
        this.env.log.msg(`${chalk.bold('output')}:\n`);
        this.env.log.msg(build.output);
      } else {
        this.env.log.msg('no output');
      }
    }
  }
}
