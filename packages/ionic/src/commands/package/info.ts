import * as chalk from 'chalk';

import { BACKEND_LEGACY, CommandLineInputs, CommandLineOptions, PackageBuild } from '@ionic/cli-utils';
import { Command, CommandMetadata } from '@ionic/cli-utils/lib/command';

@CommandMetadata({
  name: 'info',
  type: 'project',
  backends: [BACKEND_LEGACY],
  description: 'Get info about a build',
  longDescription: `
Ionic Package makes it easy to build a native binary of your app in the cloud.

Full documentation can be found here: ${chalk.bold('https://docs.ionic.io/services/package/')}
  `,
  inputs: [
    {
      name: 'id',
      description: 'The build ID. Defaults to the latest build',
      required: false,
    },
  ],
  options: [
    {
      name: 'json',
      description: 'Output build info in JSON',
      type: Boolean,
    },
  ],
  exampleCommands: ['', '15'],
})
export class PackageInfoCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {
    const { PackageClient } = await import('@ionic/cli-utils/lib/package');
    const { columnar } = await import('@ionic/cli-utils/lib/utils/format');

    const [ id ] = inputs;
    const { json } = options;

    let buildId = isNaN(Number(id)) ? undefined : Number(id);

    const token = await this.env.session.getAppUserToken();
    const pkg = new PackageClient(token, this.env.client);

    if (buildId) {
      if (!json) {
        this.env.tasks.next(`Retrieving information about build ${chalk.bold(String(buildId))}`);
      }
    } else {
      if (!json) {
        this.env.tasks.next('Retrieving latest build information');
      }

      const latestBuilds = await pkg.getBuilds({ pageSize: 1 });

      if (latestBuilds.length === 0) {
        if (json) {
          process.stdout.write(JSON.stringify(undefined));
          return 0;
        } else {
          this.env.tasks.end();
          return this.env.log.warn(`You don't have any builds yet! Run ${chalk.green('ionic package build --help')} to learn how.`);
        }
      }

      buildId = latestBuilds[0].id;
    }

    const build = await pkg.getBuild(buildId, { 'fields': ['output'] });

    if (json) {
      process.stdout.write(JSON.stringify(build));
    } else {
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
}
