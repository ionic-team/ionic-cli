import * as chalk from 'chalk';

import {
  CommandLineInputs,
  CommandLineOptions,
  Command,
  CommandMetadata,
  gatherEnvironmentInfo
} from '@ionic/cli-utils';

@CommandMetadata({
  name: 'info',
  description: 'List information about the users runtime environment',
  isProjectTask: false
})
export class InfoCommand extends Command {
  async run(inputs?: CommandLineInputs, options?: CommandLineOptions): Promise<void> {
    const info = await gatherEnvironmentInfo();

    const details: [string, string][] = [
      ['Cordova CLI', info['cordovaVersion']],
      ['Ionic Framework Version', info['ionic']],
      ['Ionic CLI Version', info['cli']],
      ['ios-deploy version', info['iosDeploy']],
      ['ios-sim version', info['iosSim']],
      ['OS', info['os']],
      ['Node Version', info['node']],
      ['Xcode version', info['xcode']]
    ];

    this.env.log.msg(`
  Your system information:

    ${details
      .filter(info => info[1] !== null && info[1] !== undefined)
      .map(info => `${chalk.bold(info[0])}: ${info[1]}`).join('\n    ')}`);
  }
}
