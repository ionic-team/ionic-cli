import { CommandLineInputs, CommandLineOptions, ICommand } from '../definitions';
import { Command, CommandMetadata } from '../lib/command';
import { gatherEnvironmentInfo } from '../lib/utils/environmentInfo';

@CommandMetadata({
  name: 'info',
  description: 'List information about the users runtime environment',
  isProjectTask: false
})
export default class InfoCommand extends Command implements ICommand {
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

    this.env.log.msg(`Your system information:

${details
  .filter(info => info[1] !== null && info[1] !== undefined)
  .map(info => `${info[0]}: ${info[1]}\n`).join('')}`);
  }
}
