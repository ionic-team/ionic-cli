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
      ['Ionic Framework', info.ionic],
      ['Ionic CLI', info.cli],
      ['app-scripts', info.appScripts],
      ['Cordova CLI', info.cordovaVersion],
      ['ios-deploy', info.iosDeploy],
      ['ios-sim', info.iosSim],
      ['OS', info.os],
      ['Node', info.node],
      ['Xcode', info.xcode],
    ].map((detail): [string, string] => [chalk.bold(detail[0]), detail[1]]);

    this.env.log.msg(`\n    ${columnar(details).split('\n').join('\n    ')}\n`);
  }
}
