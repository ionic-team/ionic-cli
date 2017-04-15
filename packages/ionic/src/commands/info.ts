import * as chalk from 'chalk';

import {
  CommandLineInputs,
  CommandLineOptions,
  Command,
  CommandMetadata,
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

    const initialValue: [string, string][] = [];
    const results = await this.env.emitter.emit('info');
    const details = results
      .reduce((acc, currentValue) => acc.concat(currentValue), initialValue)
      .sort((a, b) => strcmp(a[0], b[0]))
      .map((detail): [string, string] => [chalk.bold(detail[0]), detail[1]]);

    task.end();

    this.env.log.msg(`\n    ${columnar(details).split('\n').join('\n    ')}\n`);
  }
}
