import * as path from 'path';

import chalk from 'chalk';

import { columnar } from '@ionic/cli-framework/utils/format';
import { strcmp } from '@ionic/cli-framework/utils/string';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, InfoItem } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';

export class InfoCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'info',
      type: 'global',
      summary: 'Print system/environment info',
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const task = this.env.tasks.next('Gathering environment info');

    const initialValue: InfoItem[] = [];
    const results = await this.env.getInfo();
    const flattenedResults = results.reduce((acc, currentValue) => acc.concat(currentValue), initialValue);

    const cliDetails = flattenedResults.filter(item => item.type === 'cli-packages');
    const globalNpmDetails = flattenedResults.filter(item => item.type === 'global-packages');
    const localNpmDetails = flattenedResults.filter(item => item.type === 'local-packages');
    const systemDetails = flattenedResults.filter(item => item.type === 'system');
    const environmentDetails = flattenedResults.filter(item => item.type === 'environment');
    const miscDetails = flattenedResults.filter(item => item.type === 'misc');

    const ionicPkg = cliDetails.find(item => item.key === 'ionic');
    const pkgPath = ionicPkg && ionicPkg.path ? path.dirname(ionicPkg.path) : undefined;

    const splitInfo = (ary: InfoItem[]) => ary
      .sort((a, b) => strcmp(a.key.toLowerCase(), b.key.toLowerCase()))
      .map((item): [string, string] => [`   ${item.key}${item.flair ? ' ' + chalk.dim('(' + item.flair + ')') : ''}`, chalk.dim(item.value) + (item.path && pkgPath && !item.path.startsWith(pkgPath) ? ` ${chalk.dim('(' + item.path + ')')}` : '')]);

    const format = (details: [string, string][]) => columnar(details, { vsep: ':' });

    task.end();

    if (!this.env.project.directory) {
      this.env.log.warn('You are not in an Ionic project directory. Project context may be missing.');
    }

    if (cliDetails.length > 0) {
      this.env.log.rawmsg(`${chalk.bold('cli packages:')}${pkgPath ? ' ' + chalk.dim('(' + pkgPath + ')') : ''}\n\n`);
      this.env.log.rawmsg(`${format(splitInfo(cliDetails))}\n\n`);
    }

    if (globalNpmDetails.length > 0) {
      this.env.log.rawmsg(`${chalk.bold('global packages:')}\n\n`);
      this.env.log.rawmsg(`${format(splitInfo(globalNpmDetails))}\n\n`);
    }

    if (localNpmDetails.length > 0) {
      this.env.log.rawmsg(`${chalk.bold('local packages:')}\n\n`);
      this.env.log.rawmsg(`${format(splitInfo(localNpmDetails))}\n\n`);
    }

    if (systemDetails.length > 0) {
      this.env.log.rawmsg(`${chalk.bold('System:')}\n\n`);
      this.env.log.rawmsg(`${format(splitInfo(systemDetails))}\n\n`);
    }

    if (environmentDetails.length > 0) {
      this.env.log.rawmsg(`${chalk.bold('Environment Variables:')}\n\n`);
      this.env.log.rawmsg(`${format(splitInfo(environmentDetails))}\n\n`);
    }

    if (miscDetails.length > 0) {
      this.env.log.rawmsg(`${chalk.bold('Misc:')}\n\n`);
      this.env.log.rawmsg(`${format(splitInfo(miscDetails))}\n\n`);
    }
  }
}
