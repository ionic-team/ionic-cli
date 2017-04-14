import * as chalk from 'chalk';

import {
  CommandLineInputs,
  CommandLineOptions,
  Command,
  CommandMetadata,
  Task,
  columnar,
  gatherEnvironmentInfo
} from '@ionic/cli-utils';

@CommandMetadata({
  name: 'info',
  description: 'Print system/environment info'
})
export class InfoCommand extends Command {
  async run(inputs?: CommandLineInputs, options?: CommandLineOptions): Promise<void> {
    const task = new Task('Gathering environment info').start();
    const info = await gatherEnvironmentInfo();
    task.end();

    const details: [string, string][] = [
      ['Cordova CLI Version', info.cordovaVersion],
      ['Ionic Framework Version', info.ionic],
      ['Ionic CLI Version', info.cli],
      ['ios-deploy version', info.iosDeploy],
      ['ios-sim version', info.iosSim],
      ['OS', info.os],
      ['Node Version', info.node],
      ['Xcode version', info.xcode]
    ].map((detail): [string, string] => [chalk.bold(detail[0]), detail[1]]);

    this.env.log.msg(`\n    ${columnar(details).split('\n').join('\n    ')}\n`);
  }
}
