import * as path from 'path';

import * as chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, InfoHookItem } from '@ionic/cli-utils';
import { Command, CommandMetadata } from '@ionic/cli-utils/lib/command';

@CommandMetadata({
  name: 'info',
  type: 'global',
  description: 'Print system/environment info'
})
export class InfoCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { strcmp } = await import('@ionic/cli-utils/lib/utils/string');
    const { columnar } = await import('@ionic/cli-utils/lib/utils/format');

    const task = this.env.tasks.next('Gathering environment info');

    const initialValue: InfoHookItem[] = [];
    const results = await this.env.hooks.fire('info', { env: this.env });
    const flattenedResults = results.reduce((acc, currentValue) => acc.concat(currentValue), initialValue);

    const cliDetails = flattenedResults.filter(item => item.type === 'cli-packages');
    const globalNpmDetails = flattenedResults.filter(item => item.type === 'global-packages');
    const localNpmDetails = flattenedResults.filter(item => item.type === 'local-packages');
    const systemDetails = flattenedResults.filter(item => item.type === 'system');

    const ionicPkg = cliDetails.filter(item => item.name.startsWith('ionic'))[0];
    const pkgPath = ionicPkg && ionicPkg.path ? path.dirname(ionicPkg.path) : undefined;

    const splitInfo = (ary: InfoHookItem[]) => ary
      .sort((a, b) => strcmp(a.name.toLowerCase(), b.name.toLowerCase()))
      .map((item): [string, string] => [item.name, chalk.dim(item.version) + (item.path && pkgPath && !item.path.startsWith(pkgPath) ? ` ${chalk.dim('(' + item.path + ')')}` : '')]);

    const format = (details: [string, string][]) => columnar(details, { vsep: ':' }).split('\n').join('\n    ');

    task.end();

    if (!this.env.project.directory) {
      this.env.log.warn('You are not in an Ionic project directory. Project context may be missing.');
    }

    if (cliDetails.length > 0) {
      this.env.log.msg('\n' + chalk.bold('cli packages:') + (pkgPath ? ' ' + chalk.dim('(' + pkgPath + ')') : ''));
      this.env.log.msg(`\n    ${format(splitInfo(cliDetails))}`);
    }

    if (globalNpmDetails.length > 0) {
      this.env.log.msg('\n' + chalk.bold('global packages:'));
      this.env.log.msg(`\n    ${format(splitInfo(globalNpmDetails))}`);
    }

    if (localNpmDetails.length > 0) {
      this.env.log.msg('\n' + chalk.bold('local packages:'));
      this.env.log.msg(`\n    ${format(splitInfo(localNpmDetails))}`);
    }

    if (systemDetails.length > 0) {
      this.env.log.msg('\n' + chalk.bold('System:'));
      this.env.log.msg(`\n    ${format(splitInfo(systemDetails))}`);
    }

    this.env.log.nl();
  }
}
