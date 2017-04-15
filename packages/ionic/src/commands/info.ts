import * as chalk from 'chalk';

import {
  CommandLineInputs,
  CommandLineOptions,
  Command,
  CommandMetadata,
  CLIEventEmitterInfoEventItem,
  Task,
  columnar,
  strcmp,
} from '@ionic/cli-utils';

@CommandMetadata({
  name: 'info',
  description: 'Print system/environment info'
})
export class InfoCommand extends Command {
  async run(inputs?: CommandLineInputs, options?: CommandLineOptions): Promise<void> {
    const task = new Task('Gathering environment info').start();

    const initialValue: CLIEventEmitterInfoEventItem[] = [];
    const results = await this.env.emitter.emit('info');
    const flattenedResults = results.reduce((acc, currentValue) => acc.concat(currentValue), initialValue);

    const globalNpmDetails = flattenedResults.filter((item) => item.type === 'global-npm');
    const localNpmDetails = flattenedResults.filter((item) => item.type === 'local-npm');
    const systemDetails = flattenedResults.filter((item) => item.type === 'system');

    const prettify = (ary: CLIEventEmitterInfoEventItem[]) => ary
      .sort((a, b) => strcmp(a.name, b.name))
      .map((item): [string, string] => [item.name, chalk.dim(item.version)]);

    const format = (details: [string, string][]) => columnar(details, { vsep: ':' }).split('\n').join('\n    ');

    task.end();

    if (globalNpmDetails.length > 0) {
      this.env.log.msg('\n' + chalk.bold('npm (global):'));
      this.env.log.msg(`\n    ${format(prettify(globalNpmDetails))}`);
    }

    if (localNpmDetails.length > 0) {
      this.env.log.msg('\n' + chalk.bold('npm (local):'));
      this.env.log.msg(`\n    ${format(prettify(localNpmDetails))}`);
    }

    if (systemDetails.length > 0) {
      this.env.log.msg('\n' + chalk.bold('System:'));
      this.env.log.msg(`\n    ${format(prettify(systemDetails))}`);
    }

    this.env.log.nl();
  }
}
