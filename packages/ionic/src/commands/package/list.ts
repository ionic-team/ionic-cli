import chalk from 'chalk';

import { columnar } from '@ionic/cli-framework/utils/format';

import { BACKEND_LEGACY, CommandData, CommandLineInputs, CommandLineOptions, PackageBuild } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';

import { DEPRECATION_NOTICE } from './common';

export class PackageListCommand extends Command {
  metadata: CommandData = {
    name: 'list',
    type: 'project',
    backends: [BACKEND_LEGACY],
    deprecated: true,
    description: 'List your cloud builds',
    longDescription: `
${chalk.bold.yellow('WARNING')}: ${DEPRECATION_NOTICE}

Ionic Package makes it easy to build a native binary of your app in the cloud.

Full documentation can be found here: ${chalk.bold('https://docs.ionic.io/services/package/')}
    `,
    options: [
      {
        name: 'json',
        description: 'Output cloud builds in JSON',
        type: Boolean,
      },
    ],
    exampleCommands: [''],
  };

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { PackageClient } = await import('@ionic/cli-utils/lib/package');

    const { json } = options;

    const token = await this.env.session.getAppUserToken();
    const pkg = new PackageClient(token, this.env.client);

    if (!json) {
      this.env.tasks.next('Retrieving package builds');
    }

    const builds = await pkg.getBuilds({});

    if (json) {
      process.stdout.write(JSON.stringify(builds));
    } else {
      if (builds.length === 0) {
        this.env.tasks.end();
        return this.env.log.warn(`You don't have any builds yet! Run ${chalk.green('ionic package build --help')} to learn how.`);
      }

      const attrs: (keyof PackageBuild)[] =  ['id', 'status', 'platform', 'security_profile_tag', 'mode', 'created', 'completed'];
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
          } else if (attr === 'security_profile_tag') {
            return 'profile';
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
}
